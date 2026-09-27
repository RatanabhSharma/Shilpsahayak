const fs = require('fs');
let code = fs.readFileSync('src/components/product/ProductCard.tsx', 'utf8');

const regex = /\{\/\* Action Buttons: Add & Buy \*\/\}.*?<\/div>\s*<\/div>/s;

const newActionRow = `{/* Action Buttons: Add & Buy (Stacked mobile, side-by-side desktop) */}
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mt-3">
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

code = code.replace(regex, newActionRow);
code = code.replace('className="space-y-2.5 pt-1 border-t border-line/60"', 'className="mt-auto space-y-3 pt-3 border-t border-line/60"');
code = code.replace('className="flex items-baseline gap-1.5 font-mono"', 'className="flex items-baseline gap-2 font-mono"');

fs.writeFileSync('src/components/product/ProductCard.tsx', code);
console.log('ProductCard Done');
