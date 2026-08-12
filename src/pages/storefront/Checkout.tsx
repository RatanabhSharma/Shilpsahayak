import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { useCreateOrder } from '../../hooks/useOrders';
import { Button, Input, Textarea, Card } from '../../components/ui';

export function Checkout() {
  const navigate = useNavigate();
  const cart = useStore((state) => state.cart);
  const clearCart = useStore((state) => state.clearCart);
  const createOrder = useCreateOrder();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = subtotal >= 2000 ? 0 : 150;
  const total = subtotal + shipping;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const orderData = {
      customerName: formData.get('name') as string,
      customerEmail: formData.get('email') as string,
      customerPhone: formData.get('phone') as string,
      address: formData.get('address') as string,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        customNotes: item.customNotes,
        variantLabel: item.variantLabel
      })),
      total,
      notes: (formData.get('notes') as string) || ''
    };

    try {
      const newOrder = await createOrder.mutateAsync(orderData);
      setOrderId(newOrder.id);
      clearCart();
      setIsSuccess(true);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-charcoal mb-3">
          Order Placed Successfully!
        </h1>
        <p className="text-charcoal-light mb-2">
          Thank you for your order. We will contact you shortly.
        </p>
        <p className="text-sm text-charcoal-lighter mb-8">
          Order ID: <span className="font-medium text-charcoal">#{orderId.slice(0, 8)}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/catalog">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-serif text-charcoal mb-4">
          Your cart is empty
        </h2>
        <Link to="/catalog">
          <Button>Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-sm text-charcoal-light hover:text-brand-500 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cart
      </button>

      <h1 className="text-3xl font-serif font-bold text-charcoal mb-8">
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Form */}
        <div className="lg:col-span-3">
          <Card className="p-6 border-none shadow-sm">
            <h2 className="font-serif font-semibold text-xl text-charcoal mb-6">
              Shipping Details
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input name="name" label="Full Name" required />
                <Input name="phone" label="Phone Number" type="tel" required />
              </div>

              <Input name="email" label="Email Address" type="email" required />

              <Textarea
                name="address"
                label="Full Address"
                placeholder="House no, Street, Area, City, Pincode"
                required
              />

              <Textarea
                name="notes"
                label="Order Notes (optional)"
                placeholder="Any special instructions..."
              />

              <Button
                type="submit"
                size="lg"
                className="w-full mt-4"
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Placing Order...' : `Place Order • ₹${total.toLocaleString('en-IN')}`}
              </Button>
            </form>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <Card className="p-6 border-none shadow-sm sticky top-28">
            <h2 className="font-serif font-semibold text-xl text-charcoal mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-dark flex-shrink-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-charcoal text-sm line-clamp-1">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-charcoal-lighter mt-0.5">
                      Qty: {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-brand-600 mt-1">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">Subtotal</span>
                <span className="text-charcoal">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">Shipping</span>
                <span className="text-charcoal">
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-brand-100">
                <span className="text-charcoal">Total</span>
                <span className="text-brand-600">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}