import React, { Component } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useStore } from '../../store';
import { Button, Card } from '../../components/ui';
export function Cart() {
  const cart = useStore((state) => state.cart);
  const updateQuantity = useStore((state) => state.updateCartQuantity);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const navigate = useNavigate();
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const total = subtotal + shipping;
  const handleWhatsAppOrder = () => {
    let message = `Hi Shilp Sahayak! I'd like to place an order for:\n\n`;
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name} (x${item.quantity}) - ₹${item.product.price * item.quantity}\n`;
      if (item.customNotes) {
        message += `   Notes: ${item.customNotes}\n`;
      }
    });
    message += `\nSubtotal: ₹${subtotal}\nShipping: ₹${shipping}\n*Total: ₹${total}*`;
    window.open(
      `https://wa.me/1234567890?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };
  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">
          Your cart is empty
        </h2>
        <p className="text-charcoal-light mb-8">
          Looks like you haven't added any crafted pieces yet.
        </p>
        <Link to="/catalog">
          <Button size="lg">Explore Catalog</Button>
        </Link>
      </div>);

  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-10">
        Your Cart
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="flex-1 space-y-6">
          {cart.map((item) =>
          <Card
            key={`${item.product.id}-${item.customNotes}`}
            className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6">
            
              <div className="w-full sm:w-32 aspect-square rounded-xl overflow-hidden bg-surface-dark flex-shrink-0">
                <img
                src={item.product.image}
                alt={item.product.name}
                className="w-full h-full object-cover" />
              
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-serif font-semibold text-lg text-charcoal mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-brand-600 font-medium">
                      ₹{item.product.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-charcoal-lighter hover:text-red-500 transition-colors p-2">
                  
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {(item.variantLabel || item.customNotes) &&
              <div className="bg-surface p-3 rounded-lg mt-2 mb-4 space-y-2">
                    {item.variantLabel &&
                <div>
                        <p className="text-xs font-medium text-charcoal mb-1">
                          Options:
                        </p>
                        <p className="text-sm text-charcoal-light">
                          {item.variantLabel}
                        </p>
                      </div>
                }
                    {item.customNotes &&
                <div>
                        <p className="text-xs font-medium text-charcoal mb-1">
                          Personalisation Notes:
                        </p>
                        <p className="text-sm text-charcoal-light italic">
                          "{item.customNotes}"
                        </p>
                      </div>
                }
                  </div>
              }

                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="flex items-center inline-flex bg-surface border border-brand-200 rounded-lg">
                    <button
                    className="p-2 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                    onClick={() =>
                    updateQuantity(
                      item.product.id,
                      Math.max(1, item.quantity - 1)
                    )
                    }
                    disabled={item.quantity <= 1}>
                    
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-charcoal">
                      {item.quantity}
                    </span>
                    <button
                    className="p-2 text-charcoal hover:text-brand-500 transition-colors disabled:opacity-50"
                    onClick={() =>
                    updateQuantity(
                      item.product.id,
                      Math.min(item.product.stock, item.quantity + 1)
                    )
                    }
                    disabled={item.quantity >= item.product.stock}>
                    
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-semibold text-charcoal">
                    ₹
                    {(item.product.price * item.quantity).toLocaleString(
                    'en-IN'
                  )}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:w-96 flex-shrink-0">
          <Card className="p-6 sticky top-28">
            <h2 className="font-serif font-bold text-xl text-charcoal mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between text-charcoal-light">
                <span>Subtotal ({cart.length} items)</span>
                <span className="text-charcoal font-medium">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-charcoal-light">
                <span>Shipping</span>
                <span className="text-charcoal font-medium">
                  {shipping === 0 ?
                  <span className="text-green-600">Free</span> :

                  `₹${shipping}`
                  }
                </span>
              </div>
              {shipping > 0 &&
              <p className="text-xs text-brand-600 bg-brand-50 p-2 rounded text-center">
                  Add ₹{(2000 - subtotal).toLocaleString('en-IN')} more for free
                  shipping!
                </p>
              }
            </div>

            <div className="border-t border-brand-100 pt-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-serif font-bold text-lg text-charcoal">
                  Total
                </span>
                <span className="font-bold text-xl text-brand-600">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-xs text-charcoal-lighter text-right mt-1">
                Inclusive of all taxes
              </p>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate('/checkout')}>
                
                Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <div className="relative py-3 flex items-center">
                <div className="flex-grow border-t border-brand-100"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-charcoal-lighter uppercase tracking-wider">
                  Or
                </span>
                <div className="flex-grow border-t border-brand-100"></div>
              </div>

              <Button
                variant="whatsapp"
                className="w-full"
                size="lg"
                onClick={handleWhatsAppOrder}>
                
                Order on WhatsApp
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>);

}