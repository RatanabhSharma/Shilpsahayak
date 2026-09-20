import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useProductReviews, useAddProductReview, useUserProductReview } from '../../hooks/useProductReviews';
import { useMyOrders } from '../../hooks/useOrders';
import { useAuth } from '../../hooks/useAuth';

export function ProductReviewsSection({ productId, averageRating = 0, reviewCount = 0 }: { productId: string, averageRating?: number, reviewCount?: number }) {
  const { user } = useAuth();
  const { data: reviewsData, isLoading } = useProductReviews(productId);
  const { data: userReview } = useUserProductReview(productId, user?.uid);
  const { data: orders = [] } = useMyOrders();
  
  const addReview = useAddProductReview(productId);
  
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Find a delivered/completed order containing this product
  const eligibleOrder = orders.find(o => 
    (o.status === 'Delivered' || o.status === 'Completed' || o.status === 'Shipped') && 
    o.items.some(i => i.productId === productId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibleOrder) return;
    if (!reviewText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addReview.mutateAsync({
        rating,
        reviewText,
        orderId: eligibleOrder.id,
        userName: user?.displayName || 'Verified Customer'
      });
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit review. Your order may not have the productIds array (legacy orders).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actualReviews = reviewsData?.reviews || [];
  
  return (
    <section className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <div className="mb-10">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
            Customer Feedback
          </span>
          <h3 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
            Reviews & Ratings
          </h3>
          
          <div className="mt-4 flex items-center gap-3">
            {reviewCount > 0 ? (
              <>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? 'fill-amber-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="font-mono font-bold text-lg">{averageRating.toFixed(1)}</span>
                <span className="text-sm text-muted">Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <span className="text-sm text-muted">No reviews yet</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Review List */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <p className="text-muted">Loading reviews...</p>
            ) : actualReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-shell/50 p-10 text-center">
                <MessageSquare className="w-8 h-8 text-muted mx-auto mb-3 opacity-50" />
                <p className="text-ink font-bold">No reviews yet</p>
                <p className="text-sm text-muted mt-1">Be the first customer to review this product.</p>
              </div>
            ) : (
              actualReviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-line p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <span className="font-mono text-xs font-bold">{review.rating.toFixed(1)}</span>
                      </div>
                      <p className="text-ink text-sm leading-relaxed">"{review.reviewText}"</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-line flex items-center gap-3 text-xs text-muted">
                    <span className="font-bold text-ink">— {review.userName}</span>
                    {review.verifiedPurchase && (
                      <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-green-600" /> Verified Purchase
                      </span>
                    )}
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Submit Review */}
          <div>
            {!user ? (
              <div className="rounded-2xl border border-line bg-shell p-6 text-center">
                <p className="text-sm text-muted">Sign in and purchase this item to write a review.</p>
              </div>
            ) : userReview ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <p className="text-sm text-green-800 font-bold mb-1">You've reviewed this product</p>
                <p className="text-xs text-green-700">Status: {userReview.status}</p>
              </div>
            ) : eligibleOrder ? (
              showForm ? (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 space-y-4">
                  <h4 className="font-bold text-ink">Write a Review</h4>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Your Review</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full rounded-xl border border-line bg-shell px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="What did you think about this piece?"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-accent disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 text-sm font-bold text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-2xl border border-line bg-shell p-6 text-center">
                  <p className="text-sm text-ink mb-3">You've purchased this product. We'd love to hear your thoughts!</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full rounded-xl bg-white border border-line px-4 py-2.5 text-sm font-bold text-ink hover:border-ink transition-colors"
                  >
                    Write a Review
                  </button>
                </div>
              )
            ) : (
              <div className="rounded-2xl border border-line bg-shell p-6 text-center">
                <p className="text-sm text-muted">You can only review products you've purchased and received.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
