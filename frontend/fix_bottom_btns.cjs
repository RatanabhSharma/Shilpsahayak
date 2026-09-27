const fs = require('fs');
let code = fs.readFileSync('src/pages/storefront/CustomPrinting.tsx', 'utf8');

const oldBottomBtns = `                {/* Bottom Navigation Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleTabChange('upload')}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-line dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Upload</span>
                  </button>
  
                  <button
                    type="button"
                    onClick={() => handleTabChange('estimate')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-line dark:border-slate-700 hover:border-accent text-ink dark:text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>View Specifications &amp; Breakdown</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>`;

const newBottomBtns = `                {/* Bottom Navigation Buttons */}
                <div className="pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => handleTabChange('upload')}
                    className="w-full sm:w-auto px-5 min-h-[48px] rounded-lg border border-line dark:border-slate-700 hover:bg-shell dark:hover:bg-slate-800 bg-white dark:bg-transparent text-ink dark:text-slate-200 font-sans text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Upload</span>
                  </button>
  
                  <button
                    type="button"
                    onClick={() => handleTabChange('estimate')}
                    className="w-full sm:w-auto px-6 min-h-[48px] rounded-lg bg-ink dark:bg-slate-200 text-white dark:text-ink font-sans text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-ink/90 dark:hover:bg-slate-300 transition-colors shadow-xs"
                  >
                    <span>View Specifications &amp; Breakdown</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>`;

code = code.replace(oldBottomBtns, newBottomBtns);
fs.writeFileSync('src/pages/storefront/CustomPrinting.tsx', code);
console.log('Bottom navigation buttons updated');
