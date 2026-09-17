/**
 * Just1Play Commerce Service (PayPal Partner Commerce Platform)
 * Unified payment rail with split settlement support
 */
import { 
  paypalService, 
  type PayPalCheckoutPayload,
  type TournamentOrderPayload,
  type PayPalLiveCharge,
  type PayPalLiveSubscription,
  type PayPalBalanceInfo,
  type StripeLiveCharge,
  type StripeLiveSubscription,
  type StripeBalanceInfo,
} from './paypalService';

export type {
  PayPalCheckoutPayload,
  TournamentOrderPayload,
  PayPalLiveCharge,
  PayPalLiveSubscription,
  PayPalBalanceInfo,
  StripeLiveCharge,
  StripeLiveSubscription,
  StripeBalanceInfo,
};

export interface RedirectToCheckoutOptions {
  sessionId?: string;
  orderId?: string;
  url?: string;
  cancelUrl?: string;
  successUrl?: string;
}

export interface TournamentCheckoutPayload {
  eventId: string;
  eventTitle?: string;
  teamId?: string;
  divisionId?: string;
  divisionName?: string;
  teamName: string;
  headCoachName?: string;
  headCoachEmail?: string;
  headCoachPhone?: string;
  rosterSize?: number;
  entryFeeDollars: number;
  platformFeeDollars?: number;
  directorPayPalMerchantId?: string;
  organizerStripeAccountId?: string;
  origin?: string;
}

export class CommerceService {
  private static instance: CommerceService;

  private constructor() {}

  public static getInstance(): CommerceService {
    if (!CommerceService.instance) {
      CommerceService.instance = new CommerceService();
    }
    return CommerceService.instance;
  }

  public async redirectToCheckout(options: RedirectToCheckoutOptions): Promise<void> {
    const { url } = options;
    if (url) {
      window.location.href = url;
    }
  }

  public async createTournamentCheckoutSession(
    payload: TournamentCheckoutPayload
  ): Promise<{ success: boolean; url: string; orderID: string; splitPayoutApplied: boolean }> {
    const result = await paypalService.createTournamentRegistrationOrder({
      eventId: payload.eventId,
      eventTitle: payload.eventTitle || 'Tournament Event',
      teamId: payload.teamId,
      divisionId: payload.divisionId,
      divisionName: payload.divisionName,
      teamName: payload.teamName,
      headCoachName: payload.headCoachName,
      headCoachEmail: payload.headCoachEmail,
      totalAmount: payload.entryFeeDollars,
      platformFeeDollars: payload.platformFeeDollars || 25,
      directorPayPalMerchantId: payload.directorPayPalMerchantId || payload.organizerStripeAccountId,
    });

    return {
      success: result.success,
      url: result.url || window.location.origin,
      orderID: result.orderID,
      splitPayoutApplied: !!(payload.directorPayPalMerchantId || payload.organizerStripeAccountId),
    };
  }

  public async createSubscriptionCheckout(options: {
    tierId: string;
    planName: string;
    billingCycle?: 'monthly' | 'annual';
    amount?: number;
    userId?: string;
    customerEmail?: string;
  }) {
    return paypalService.createOrder({
      type: 'subscription',
      tierId: options.tierId,
      planName: options.planName,
      totalAmount: options.amount || 14.99,
      headCoachEmail: options.customerEmail,
    });
  }

  public async getStatus() {
    return paypalService.getStatus();
  }

  public async getCharges(limit = 25) {
    return paypalService.getCharges(limit);
  }

  public async fetchLiveCharges(limit = 25) {
    return paypalService.getCharges(limit);
  }

  public async getSubscriptions(limit = 25) {
    return paypalService.getSubscriptions();
  }

  public async fetchLiveSubscriptions() {
    return paypalService.getSubscriptions();
  }

  public async getBalance() {
    return paypalService.getBalance();
  }

  public async fetchLiveBalance() {
    return paypalService.getBalance();
  }

  public async issueRefund(params: { paymentIntentId?: string; chargeId?: string; amount?: number; reason?: string }) {
    return paypalService.issueRefund(params);
  }

  public async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    return paypalService.cancelSubscription(subscriptionId, immediately);
  }

  public async createOrganizerOnboardingLink(userId: string, email: string) {
    return paypalService.createDirectorOnboardingLink(userId, email);
  }

  public async createOrganizerDashboardLink(merchantId?: string) {
    return paypalService.createDirectorDashboardLink(merchantId);
  }
}

export const stripeService = CommerceService.getInstance();
export const commerceService = CommerceService.getInstance();
export default commerceService;
