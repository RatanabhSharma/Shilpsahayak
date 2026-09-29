import os

with open("frontend/src/pages/storefront/Account.tsx", "r", encoding="utf-8") as f:
    content = f.read()

addr_start = content.find("{/* ADDRESS TAB */}")
prof_start = content.find("{/* PROFILE TAB */}")

if addr_start != -1 and prof_start != -1:
    address_tab_str = content[addr_start:prof_start]
    
    main_addr_start = address_tab_str.find('<div className="rounded-3xl border border-line bg-white p-7 shadow-soft">')
    aside_addr_start = address_tab_str.find('<aside className="lg:col-span-5">')
    
    if main_addr_start != -1 and aside_addr_start != -1:
        main_addr_card = address_tab_str[main_addr_start:aside_addr_start].strip()
        if main_addr_card.endswith('</div>'):
            main_addr_card = main_addr_card[:-6].strip()
            
        aside_addr_end = address_tab_str.find('</aside>')
        aside_addr_content = address_tab_str[aside_addr_start + len('<aside className="lg:col-span-5">'):aside_addr_end].strip()
        
        # Remove old address tab
        content = content.replace(address_tab_str, "")
        
        # Change profile wrapper to space-y-6
        content = content.replace(
            '<div className="lg:col-span-7">\n              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">',
            '<div className="lg:col-span-7 space-y-6">\n              <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">'
        )
        
        # Inject main_addr_card just before aside
        prof_aside_start = content.find('<aside className="lg:col-span-5">')
        if prof_aside_start != -1:
            insertion_point = content.rfind('</div>', 0, prof_aside_start)
            content = content[:insertion_point + 6] + "\n\n" + main_addr_card + "\n" + content[insertion_point + 6:]
            
            # Re-find aside
            prof_aside_start = content.find('<aside className="lg:col-span-5">')
            
            # WAIT! Let's inject into the aside! We just need to add space-y-6 to the aside to space out the cards
            content = content[:prof_aside_start] + '<aside className="lg:col-span-5 space-y-6">' + content[prof_aside_start + len('<aside className="lg:col-span-5">'):]
            
            # Re-find aside (which now has space-y-6)
            prof_aside_start = content.find('<aside className="lg:col-span-5 space-y-6">')
            prof_aside_end = content.find('</aside>', prof_aside_start)
            
            content = content[:prof_aside_end] + "\n\n" + aside_addr_content + "\n" + content[prof_aside_end:]
            
            with open("frontend/src/pages/storefront/Account.tsx", "w", encoding="utf-8") as f:
                f.write(content)
            print("Successfully merged tabs")
        else:
            print("Could not find profile aside")
    else:
        print("Could not parse address blocks")
else:
    print("Could not find tab tags")
