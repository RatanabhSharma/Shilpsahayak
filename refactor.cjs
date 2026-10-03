const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/AdminLayout.tsx', 'utf8');

const navItemsReplacement = `  const navItems: NavItemConfig[] = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Operations',
      path: '/admin/orders',
      icon: ShoppingBag,
      children: [
        {
          name: 'Customer Orders',
          path: '/admin/orders',
          icon: ShoppingBag,
        },
        {
          name: 'Custom CAD Quotes',
          path: '/admin/quotes',
          icon: FileText,
        },
        {
          name: 'Customer Inquiries',
          path: '/admin/inquiries',
          icon: MessageSquare,
        },
        {
          name: 'Reviews',
          path: '/admin/reviews',
          icon: Star,
        },
      ],
    },
    {
      name: 'Catalogue',
      path: '/admin/catalog',
      icon: Package,
      children: [
        {
          name: 'Products',
          path: '/admin/catalog',
          icon: Package,
        },
        {
          name: 'Inventory',
          path: '/admin/inventory',
          icon: Layers,
        },
      ],
    },
    {
      name: 'Customers',
      path: '/admin/customers',
      icon: Users,
      children: [
        {
          name: 'Customer Directory',
          path: '/admin/customers',
          icon: Users,
        },
      ],
    },
    {
      name: 'Storefront',
      path: '/admin/home',
      icon: Home,
      children: [
        {
          name: 'Homepage CMS',
          path: '/admin/home',
          icon: Home,
        },
        {
          name: 'Branding',
          path: '/admin/branding',
          icon: Palette,
        },
      ],
    },
    {
      name: 'Marketing',
      path: '/admin/coupons',
      icon: Tag,
      children: [
        {
          name: 'Coupons & Discounts',
          path: '/admin/coupons',
          icon: Tag,
        },
      ],
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      children: [
        {
          name: 'Business Information',
          path: '/admin/settings?tab=business',
          icon: Building2,
          isSettingsTab: true,
        },
        {
          name: 'Pricing & Slicing',
          path: '/admin/settings?tab=pricing',
          icon: Sliders,
          isSettingsTab: true,
        },
        {
          name: 'Printers & Profiles',
          path: '/admin/settings?tab=printers',
          icon: Printer,
          isSettingsTab: true,
        },
        {
          name: 'Shipping & Delivery',
          path: '/admin/settings?tab=shipping',
          icon: Truck,
          isSettingsTab: true,
        },
        {
          name: 'Operational Alerts',
          path: '/admin/settings?tab=notifications',
          icon: Bell,
          isSettingsTab: true,
        },
      ],
    },
  ];`;

code = code.replace(/const navGroups: NavGroupConfig\[\] = \[[\s\S]*?\n  \];/m, navItemsReplacement);

const activeCheckReplacement = `  const allNavItems = navItems.flatMap((item) => [item, ...(item.children || [])]);
  const currentNav = allNavItems.find((item) => {
    if (item.children) return false;
    if (item.isComingSoon) return false;
    if (item.isSettingsTab) {
      return (
        location.pathname === '/admin/settings' &&
        (location.search ? item.path.includes(location.search) : item.path.includes('tab=business'))
      );
    }
    return location.pathname.startsWith(item.path);
  });`;

code = code.replace(/const allNavItems = navGroups\.flatMap\(\(g\) => g\.items\);\s*const currentNav = allNavItems\.find\(\(item\) => \{[\s\S]*?\}\);/m, activeCheckReplacement);

const listReplacement = `        {/* Hierarchical Navigation List */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;

              if (item.children) {
                const isAnyChildActive = item.children.some(child => {
                  if (child.isSettingsTab) {
                    const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                    return location.pathname === '/admin/settings' && child.path.includes(\`tab=\${currentTab}\`);
                  }
                  return location.pathname.startsWith(child.path);
                });
                
                const isOpen = openMenus[item.name] ?? isAnyChildActive;
                
                return (
                  <div key={item.name} className="space-y-0.5">
                    <button
                      onClick={() => setOpenMenus(prev => ({ ...prev, [item.name]: !isOpen }))}
                      className={\`w-full flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all \${
                        isAnyChildActive ? 'text-accent font-semibold' : 'text-muted hover:text-ink hover:bg-shell'
                      }\`}
                    >
                      <div className="flex items-center min-w-0">
                        <Icon className={\`w-4 h-4 mr-2.5 shrink-0 \${isAnyChildActive ? 'text-accent' : 'text-muted'}\`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <ChevronDown className={\`w-3.5 h-3.5 shrink-0 transition-transform \${isOpen ? 'rotate-180' : ''}\`} />
                    </button>
                    
                    {isOpen && (
                      <div className="pl-5 pr-1 space-y-0.5 mt-0.5">
                        {item.children.map(child => {
                          const ChildIcon = child.icon;
                          let isChildActive = false;
                          if (child.isSettingsTab) {
                            const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                            isChildActive = location.pathname === '/admin/settings' && child.path.includes(\`tab=\${currentTab}\`);
                          } else {
                            isChildActive = location.pathname.startsWith(child.path);
                          }
                          
                          if (child.isComingSoon) {
                            return (
                              <div
                                key={child.name}
                                title={\`Coming in \${child.badge || 'future phase'}\`}
                                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-muted/50 cursor-not-allowed select-none group"
                              >
                                <div className="flex items-center min-w-0">
                                  <ChildIcon className="w-4 h-4 mr-2.5 shrink-0 text-muted/40" />
                                  <span className="truncate">{child.name}</span>
                                </div>
                                {child.badge && (
                                  <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-shell text-muted/70 shrink-0">
                                    {child.badge}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={child.name}
                              to={child.path}
                              onClick={() => setIsSidebarOpen(false)}
                              className={\`flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all \${
                                isChildActive
                                  ? 'bg-accent text-white shadow-xs font-semibold'
                                  : 'text-muted hover:text-ink hover:bg-shell'
                              }\`}
                            >
                              <div className="flex items-center min-w-0">
                                <ChildIcon className={\`w-4 h-4 mr-2.5 shrink-0 \${isChildActive ? 'text-white' : 'text-muted'}\`} />
                                <span className="truncate">{child.name}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Active check for standalone item:
              let isActive = false;
              if (!item.isComingSoon) {
                if (item.isSettingsTab) {
                  const currentTab = new URLSearchParams(location.search).get('tab') || 'business';
                  isActive =
                    location.pathname === '/admin/settings' &&
                    item.path.includes(\`tab=\${currentTab}\`);
                } else {
                  isActive = location.pathname.startsWith(item.path);
                }
              }

              if (item.isComingSoon) {
                return (
                  <div
                    key={item.name}
                    title={\`Coming in \${item.badge || 'future phase'}\`}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-muted/50 cursor-not-allowed select-none group"
                  >
                    <div className="flex items-center min-w-0">
                      <Icon className="w-4 h-4 mr-2.5 shrink-0 text-muted/40" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-shell text-muted/70 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={\`flex items-center justify-between px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all \${
                    isActive
                      ? 'bg-accent text-white shadow-xs font-semibold'
                      : 'text-muted hover:text-ink hover:bg-shell'
                  }\`}
                >
                  <div className="flex items-center min-w-0">
                    <Icon
                      className={\`w-4 h-4 mr-2.5 shrink-0 \${
                        isActive ? 'text-white' : 'text-muted'
                      }\`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>`;

code = code.replace(/\{\/\* Grouped Navigation List \*\/\}[\s\S]*?<\/aside>/m, listReplacement + '\n      </aside>');

fs.writeFileSync('frontend/src/components/AdminLayout.tsx', code);
