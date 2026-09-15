import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Package, 
  ShieldCheck, 
  Sparkles,
  Printer,
  Layers,
  Info
} from 'lucide-react';
import { usePrintCart, CartItem } from '../../context/PrintCartContext';
import { resolveGoogleDriveImageUrl } from '../../utils/storageUrlResolver';
import { triggerHaptic } from '../../lib/haptics';

export const PrintCartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartOpen, 
    closeCart, 
    removeFromCart, 
    updateCopies, 
    clearCart, 
    totalCount, 
    subtotal, 
    openCheckout 
  } = usePrintCart();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    triggerHaptic('medium');
    openCheckout();
  };

  return (
    <AnimatePresence>
      <div 
        id="print-cart-drawer-root" 
        className="fixed inset-0 z-[100] flex justify-end"
      >
        {/* Backdrop */}
        <motion.div
          id="print-cart-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            triggerHaptic('light');
            closeCart();
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Slide-over Drawer Panel */}
        <motion.div
          id="print-cart-drawer-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#0A0D14] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <span>Print Order Cart</span>
                  {totalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                      {totalCount} {totalCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Prodigi Archival Lab • Bulk Order
                </p>
              </div>
            </div>

            <button
              id="close-print-cart-drawer-btn"
              type="button"
              onClick={() => {
                triggerHaptic('light');
                closeCart();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-white/5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500">
                  <Printer className="w-8 h-8 opacity-60" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-sm font-bold text-white">Your Print Cart is Empty</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Explore player action shots and portraits in the gallery. Select single prints or sports package bundles to build your consolidated order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    closeCart();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition border border-white/10 cursor-pointer"
                >
                  Browse Gallery Photos
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {cart.map((item: CartItem) => {
                  const resolvedImg = resolveGoogleDriveImageUrl(item.previewUrl || item.highResUrl || '');
                  const itemLineTotal = (item.price * item.copies).toFixed(2);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-white/15 transition-all flex gap-3 relative group"
                    >
                      {/* Photo Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-black/50 border border-white/10 shrink-0 relative flex items-center justify-center">
                        {resolvedImg ? (
                          <img
                            src={resolvedImg}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover select-none pointer-events-none"
                            loading="lazy"
                          />
                        ) : (
                          <Layers className="w-6 h-6 text-slate-600" />
                        )}
                        {item.isBundle && (
                          <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[#00F5D4] text-[8px] font-mono font-bold uppercase">
                            Bundle
                          </span>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white truncate max-w-[170px]" title={item.title}>
                              {item.title || 'Game Showcase Photo'}
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                removeFromCart(item.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 transition p-1 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] font-mono text-[#00F5D4] font-semibold mt-0.5 truncate">
                            {item.formatName}
                          </div>
                          {item.creatorName && (
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                              Creator: {item.creatorName}
                            </div>
                          )}
                        </div>

                        {/* Controls & Price */}
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                          {/* Copies Stepper */}
                          <div className="flex items-center gap-1.5 bg-slate-950/60 rounded-lg border border-white/10 p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                updateCopies(item.id, item.copies - 1);
                              }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Decrease copies"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs font-bold text-slate-200 px-1.5 min-w-[20px] text-center">
                              {item.copies}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                updateCopies(item.id, item.copies + 1);
                              }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                              title="Increase copies"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line item subtotal */}
                          <div className="text-right">
                            <div className="font-mono text-xs font-black text-white">
                              ${itemLineTotal}
                            </div>
                            {item.copies > 1 && (
                              <div className="text-[9px] font-mono text-slate-500">
                                ${item.price.toFixed(2)} each
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/90 backdrop-blur-md space-y-3 shrink-0">
              {/* Consolidated Shipping Notice */}
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200 leading-snug">
                  <strong>Consolidated Shipping:</strong> All photos ship together from the lab in a single protective package so you only pay shipping once.
                </p>
              </div>

              {/* Subtotal Row */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Prints Subtotal ({totalCount} total)</span>
                <span className="font-black text-white text-sm">${subtotal.toFixed(2)} USD</span>
              </div>

              {/* 85/15 Split Transparency Notice */}
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400/90 bg-emerald-950/20 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>85% Creator Direct Share</span>
                </span>
                <span className="font-bold">Prodigi Lab Direct</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  id="checkout-from-drawer-btn"
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  <span>Proceed to Consolidated Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      clearCart();
                    }}
                    className="text-[11px] font-mono text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      closeCart();
                    }}
                    className="text-[11px] font-mono text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrintCartDrawer;
