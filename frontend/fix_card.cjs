const fs = require('fs');
let code = fs.readFileSync('src/components/product/ProductCard.tsx', 'utf8');

// Action Row Spacing and Layout
const oldActionRow = `              {/* Price & Action Row */}
              <div className="space-y-2.5 pt-1 border-t border-line/60">
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className="text-sm sm:text-base font-bold text-ink">
                    {hasVariantPrices ? 'From ' : ''}?{regularPrice.toLocaleString('en-IN')}
                  </span>
                  {compareAtPrice > regularPrice && (
                    <span className="text-[11px] text-muted line-through">
                      ?{compareAtPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Action Buttons: Add & Buy */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="flex items-center justify-center gap-1 h-8 rounded-lg border border-line bg-shell/80 font-sans text-xs font-semibold text-ink hover:bg-ink hover:text-white hover:border-ink active:scale-95 transition-all duration-150 cursor-pointer"
                    title={cartQuantity > 0 ? 'Increase quantity' : 'Add to cart'}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{cartQuantity > 0 ? \`IN CART × \${cartQuantity}\` : 'ADD TO CART'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex items-center justify-center gap-1 h-8 rounded-lg bg-accent text-white font-sans text-xs font-semibold shadow-xs hover:bg-accent-hover active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Buy now"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>BUY NOW</span>
                  </button>
                </div>
              </div>`;

const newActionRow = `              {/* Price & Action Row */}
              <div className="mt-auto space-y-3 pt-3 border-t border-line/60">
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-base font-bold text-ink">
                    {hasVariantPrices ? 'From ' : ''}?{regularPrice.toLocaleString('en-IN')}
                  </span>
                  {compareAtPrice > regularPrice && (
                    <span className="text-xs text-muted line-through">
                      ?{compareAtPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Action Buttons: Add & Buy (Stacked mobile, side-by-side desktop) */}
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] w-full rounded-md border border-line bg-white font-sans text-[11px] font-bold text-ink hover:bg-shell active:scale-95 transition-all duration-150 cursor-pointer shadow-xs"
                    title={cartQuantity > 0 ? 'Increase quantity' : 'Add to cart'}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{cartQuantity > 0 ? \`IN CART × \${cartQuantity}\` : 'ADD TO CART'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] w-full rounded-md bg-ink text-white font-sans text-[11px] font-bold shadow-xs hover:bg-ink/90 active:scale-95 transition-all duration-150 cursor-pointer"
                    title="Buy now"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>BUY NOW</span>
                  </button>
                </div>
              </div>`;

if (code.includes('Action Buttons: Add & Buy')) {
  code = code.replace(oldActionRow, newActionRow);
  fs.writeFileSync('src/components/product/ProductCard.tsx', code);
  console.log('ProductCard Done');
} else {
  console.log('Already done or not found');
}
