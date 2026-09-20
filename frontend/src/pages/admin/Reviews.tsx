import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ProductReview, ReviewStatus } from '../../hooks/useProductReviews';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../../store';

// Helper to update product average rating
async function updateProductRatingStats(productId: string) {
  const reviewsRef = collection(db, 'products', productId, 'reviews');
  const reviewsSnap = await getDocs(query(reviewsRef));
  
  let totalRating = 0;
  let approvedCount = 0;

  reviewsSnap.forEach((d) => {
    const r = d.data();
    if (r.status === 'approved') {
      totalRating += r.rating;
      approvedCount += 1;
    }
  });

  const averageRating = approvedCount > 0 ? totalRating / approvedCount : 0;

  await updateDoc(doc(db, 'products', productId), {
    averageRating,
    reviewCount: approvedCount,
  });
}

export function Reviews() {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const s = await getDocs(collection(db, 'products'));
      return s.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
    }
  });

  const { data: allReviews = [], isLoading } = useQuery({
    queryKey: ['adminReviews'],
    queryFn: async () => {
      let results: ProductReview[] = [];
      const prodSnap = await getDocs(collection(db, 'products'));
      
      for (const prod of prodSnap.docs) {
        const pId = prod.id;
        const revSnap = await getDocs(collection(db, 'products', pId, 'reviews'));
        revSnap.forEach(r => {
          results.push({ id: r.id, ...r.data(), createdAt: r.data().createdAt?.toDate().toISOString() || new Date().toISOString() } as ProductReview);
        });
      }
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  });

  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  
  const filteredReviews = allReviews.filter(r => filter === 'all' || r.status === filter);

  const updateReview = useMutation({
    mutationFn: async ({ productId, reviewId, status }: { productId: string, reviewId: string, status: ReviewStatus }) => {
      const ref = doc(db, 'products', productId, 'reviews', reviewId);
      await updateDoc(ref, { status });
      await updateProductRatingStats(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Product Reviews</h1>
          <p className="text-sm text-muted mt-2">Manage and moderate customer reviews.</p>
        </div>
        <div className="flex gap-2 bg-shell p-1 rounded-lg">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-10 text-center text-muted">No reviews found.</div>
        ) : (
          <div className="divide-y divide-line">
            {filteredReviews.map(r => {
              const product = products.find(p => p.id === r.productId);
              return (
                <div key={r.id} className="p-6 flex items-start gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-bold font-mono">
                        {r.rating.toFixed(1)} <span className="text-[10px]">?</span>
                      </div>
                      <span className="text-sm font-bold text-ink">{r.userName}</span>
                      <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                      {r.status === 'pending' && <span className="flex items-center gap-1 text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>}
                      {r.status === 'approved' && <span className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
                      {r.status === 'rejected' && <span className="flex items-center gap-1 text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span>}
                    </div>
                    
                    <p className="text-sm text-ink">"{r.reviewText}"</p>
                    
                    <div className="text-xs text-muted">
                      Product: <span className="font-medium text-ink">{product?.name || r.productId}</span> • Order: <span className="font-mono">{r.orderId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {r.status !== 'approved' && (
                      <button
                        onClick={() => updateReview.mutate({ productId: r.productId, reviewId: r.id, status: 'approved' })}
                        className="px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== 'rejected' && (
                      <button
                        onClick={() => updateReview.mutate({ productId: r.productId, reviewId: r.id, status: 'rejected' })}
                        className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
