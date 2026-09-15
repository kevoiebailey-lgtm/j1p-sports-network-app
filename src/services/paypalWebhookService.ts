/**
 * PayPal Webhook Processing Service
 * Handles webhook notifications for:
 * - CHECKOUT.ORDER.APPROVED
 * - PAYMENT.CAPTURE.COMPLETED
 * - MERCHANT.ONBOARDING.COMPLETED
 * - BILLING.SUBSCRIPTION.ACTIVATED / CANCELLED
 */

import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';

export interface PayPalWebhookEvent {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: Record<string, any>;
  links?: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalWebhookProcessingResult {
  success: boolean;
  action: string;
  eventId: string;
  eventType: string;
  details?: any;
  error?: string;
}

export class PayPalWebhookHandler {
  /**
   * Main webhook ingress router
   */
  static async processEvent(event: PayPalWebhookEvent): Promise<PayPalWebhookProcessingResult> {
    const eventType = event.event_type;
    const resource = event.resource || {};

    console.log(`[PayPal Webhook Ingress] Received ${eventType} (${event.id})`);

    try {
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
        case 'CHECKOUT.ORDER.COMPLETED':
          return await this.handlePaymentCaptureCompleted(resource, event.id);

        case 'MERCHANT.ONBOARDING.COMPLETED':
          return await this.handleMerchantOnboardingCompleted(resource, event.id);

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
        case 'BILLING.SUBSCRIPTION.CREATED':
          return await this.handleSubscriptionActivated(resource, event.id);

        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          return await this.handleSubscriptionCancelled(resource, event.id);

        default:
          return {
            success: true,
            action: 'IGNORED_EVENT_TYPE',
            eventId: event.id,
            eventType,
            details: { summary: event.summary }
          };
      }
    } catch (err: any) {
      console.error(`[PayPal Webhook Error] Failed processing ${eventType}:`, err);
      return {
        success: false,
        action: 'PROCESSING_FAILED',
        eventId: event.id,
        eventType,
        error: err.message || String(err)
      };
    }
  }

  /**
   * Handle Payment Capture for tournament entries, photo downloads, and purchases
   */
  private static async handlePaymentCaptureCompleted(
    resource: Record<string, any>, 
    webhookEventId: string
  ): Promise<PayPalWebhookProcessingResult> {
    const customId = resource.custom_id || resource.invoice_id || '';
    const amount = resource.amount?.value ? parseFloat(resource.amount.value) : 0;
    const orderId = resource.supplementary_data?.related_ids?.order_id || resource.id;

    // Parse custom_id payload if formatted as json or key-value
    let parsedMetadata: Record<string, any> = {};
    try {
      if (customId.startsWith('{')) {
        parsedMetadata = JSON.parse(customId);
      }
    } catch {
      // Ignore parse failure
    }

    const eventId = parsedMetadata.eventId;
    const teamId = parsedMetadata.teamId;
    const userId = parsedMetadata.userId;

    if (db && eventId && teamId) {
      const regId = `reg_${eventId}_${teamId}`;
      const regRef = doc(db, `events/${eventId}/registrations`, regId);
      await setDoc(regRef, {
        paymentStatus: 'Fully Paid',
        paidAmount: amount,
        paypalCaptureId: resource.id,
        paypalOrderId: orderId,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return {
      success: true,
      action: 'PAYMENT_CAPTURED_AND_RECORDED',
      eventId: webhookEventId,
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      details: {
        amount,
        orderId,
        captureId: resource.id,
        eventId,
        teamId
      }
    };
  }

  /**
   * Handle Merchant Referral Onboarding completion for Tournament Directors
   */
  private static async handleMerchantOnboardingCompleted(
    resource: Record<string, any>,
    webhookEventId: string
  ): Promise<PayPalWebhookProcessingResult> {
    const merchantId = resource.merchant_id || resource.payer_id;
    const trackingId = resource.tracking_id || resource.partner_client_id;
    const email = resource.primary_email || '';

    if (db && trackingId) {
      // Find matching user by uid or tracking ID
      const userRef = doc(db, 'users', trackingId);
      await setDoc(userRef, {
        paypalMerchantId: merchantId,
        paypalEmail: email,
        paypalOnboardingStatus: 'ACTIVE',
        paypalAccountStatus: 'active',
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const dirRef = doc(db, 'directors', trackingId);
      await setDoc(dirRef, {
        paypalMerchantId: merchantId,
        paypalEmail: email,
        onboardingStatus: 'ACTIVE',
        paymentsReceivable: true,
        primaryEmailConfirmed: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return {
      success: true,
      action: 'MERCHANT_ONBOARDED',
      eventId: webhookEventId,
      eventType: 'MERCHANT.ONBOARDING.COMPLETED',
      details: { merchantId, trackingId, email }
    };
  }

  /**
   * Handle Subscription Activated
   */
  private static async handleSubscriptionActivated(
    resource: Record<string, any>,
    webhookEventId: string
  ): Promise<PayPalWebhookProcessingResult> {
    const subscriptionId = resource.id;
    const subscriber = resource.subscriber || {};
    const email = subscriber.email_address;
    const customId = resource.custom_id;

    if (db && (customId || email)) {
      let targetUserId = customId;

      if (!targetUserId && email) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetUserId = snap.docs[0].id;
        }
      }

      if (targetUserId) {
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, {
          subscriptionStatus: 'active',
          hasActiveSubscription: true,
          paypalSubscriptionId: subscriptionId,
          subscriptionUpdatedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    return {
      success: true,
      action: 'SUBSCRIPTION_ACTIVATED',
      eventId: webhookEventId,
      eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
      details: { subscriptionId, email }
    };
  }

  /**
   * Handle Subscription Cancelled
   */
  private static async handleSubscriptionCancelled(
    resource: Record<string, any>,
    webhookEventId: string
  ): Promise<PayPalWebhookProcessingResult> {
    const subscriptionId = resource.id;

    if (db) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('paypalSubscriptionId', '==', subscriptionId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'users', d.id), {
          subscriptionStatus: 'canceled',
          hasActiveSubscription: false,
          subscriptionUpdatedAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    return {
      success: true,
      action: 'SUBSCRIPTION_CANCELLED',
      eventId: webhookEventId,
      eventType: 'BILLING.SUBSCRIPTION.CANCELLED',
      details: { subscriptionId }
    };
  }
}
