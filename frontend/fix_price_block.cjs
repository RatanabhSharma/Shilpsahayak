const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/ProductDetail.tsx', 'utf8');

const oldPriceBlock = `                {/* Price Display */}
                <div className="mt-5 flex flex-col gap-2 border-y border-line py-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-xs text-muted block uppercase">Price</span>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-3xl font-bold text-ink">
                          ?{currentPrice.toLocaleString('en-IN')}
                        </span>
                        {discountPercent > 0 && currentOriginalPrice > currentPrice && (
                          <>
                            <span className="font-mono text-sm text-muted line-through">
                              ?{currentOriginalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white shadow-sm">
                              Save {discountPercent}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-xs text-accent font-semibold">
                      {settings?.freeShippingThreshold ? \`Free shipping > ?\${settings.freeShippingThreshold}\` : 'Free shipping on qualified orders'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Fabricated & carefully hand-inspected in Patiala workshop</span>
                  </div>
                </div>`;

const newPriceBlock = `                {/* Price Display */}
                <div className="mt-6 flex flex-col gap-4 border-y border-line py-5">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <span className="font-mono text-[10px] text-muted block uppercase tracking-wider mb-1">Price</span>
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <span className="font-mono text-4xl font-bold text-ink">
                          ?{currentPrice.toLocaleString('en-IN')}
                        </span>
                        {discountPercent > 0 && currentOriginalPrice > currentPrice && (
                          <>
                            <span className="font-mono text-sm text-muted line-through">
                              ?{currentOriginalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold uppercase text-emerald-700 border border-emerald-200">
                              Save {discountPercent}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-accent font-semibold bg-accent-soft/30 px-2 py-1 rounded-md self-start sm:self-auto">
                      {settings?.freeShippingThreshold ? \`Free shipping over ?\${settings.freeShippingThreshold}\` : 'Free shipping on qualified orders'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-emerald-700 font-semibold font-sans">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Fabricated & carefully hand-inspected in Patiala workshop</span>
                  </div>
                </div>`;

code = code.replace(oldPriceBlock, newPriceBlock);
fs.writeFileSync('src/pages/storefront/ProductDetail.tsx', code);
console.log('Price block updated');
