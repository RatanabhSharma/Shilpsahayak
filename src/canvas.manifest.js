export const manifest = {
  screens: {
    scr_9ugrct: { name: "Home", route: "/", position: { "x": 160, "y": 220 } },
    scr_p5vc67: { name: "Catalog", route: "/catalog", position: { "x": 1560, "y": 220 } },
    scr_vo6gyh: { name: "Product Detail", route: "/product/p1", position: { "x": 2960, "y": 220 } },
    scr_wi5lbo: { name: "Cart", route: "/cart", position: { "x": 4360, "y": 220 } },
    scr_06d1gc: { name: "Checkout", route: "/checkout", position: { "x": 5760, "y": 220 } },
    scr_epbp4p: { name: "Custom Service", route: "/custom-service", position: { "x": 160, "y": 2200 } },
    scr_xuus80: { name: "About", route: "/about", position: { "x": 2960, "y": 2200 } },
    scr_nim0ko: { name: "Contact", route: "/contact", position: { "x": 4360, "y": 2200 } },
    scr_42dq97: { name: "Admin Login", route: "/admin/login", position: { "x": 160, "y": 4180 } },
    scr_ecpltq: { name: "Admin Dashboard", route: "/admin/dashboard", position: { "x": 1560, "y": 4180 } },
    scr_fneilf: { name: "Admin Orders", route: "/admin/orders", position: { "x": 2960, "y": 4180 } },
    scr_hz1o40: { name: "Admin Order Detail", route: "/admin/orders/ORD-1001", position: { "x": 4360, "y": 4180 } },
    scr_2x4zw4: { name: "Admin Quotes", route: "/admin/quotes", position: { "x": 5760, "y": 4180 } },
    scr_ci4n2p: { name: "Admin Catalog", route: "/admin/catalog", position: { "x": 7160, "y": 4180 } },
    scr_pch8qn: { name: "Admin Inventory", route: "/admin/inventory", position: { "x": 8560, "y": 4180 } },
    scr_yexk8f: { name: "Admin Customers", route: "/admin/customers", position: { "x": 9960, "y": 4180 } },
    scr_p1vicg: { name: "Admin Settings", route: "/admin/settings", position: { "x": 11360, "y": 4180 } }
  },
  sections: {
    sec_aqhp9n: { name: "Customer Shopping", x: 0, y: 0, width: 7120, height: 1180 },
    sec_n7rnbh: { name: "Marketing & Info", x: 0, y: 1980, width: 5720, height: 1180 },
    sec_xgibzl: { name: "Admin Panel", x: 0, y: 3960, width: 12720, height: 1180 }
  },
  layers: [
  { kind: "section", id: "sec_aqhp9n", children: [
    { kind: "screen", id: "scr_9ugrct" },
    { kind: "screen", id: "scr_p5vc67" },
    { kind: "screen", id: "scr_vo6gyh" },
    { kind: "screen", id: "scr_wi5lbo" },
    { kind: "screen", id: "scr_06d1gc" }]
  },
  { kind: "section", id: "sec_n7rnbh", children: [
    { kind: "screen", id: "scr_epbp4p" },
    { kind: "screen", id: "scr_xuus80" },
    { kind: "screen", id: "scr_nim0ko" }]
  },
  { kind: "section", id: "sec_xgibzl", children: [
    { kind: "screen", id: "scr_42dq97" },
    { kind: "screen", id: "scr_ecpltq" },
    { kind: "screen", id: "scr_fneilf" },
    { kind: "screen", id: "scr_hz1o40" },
    { kind: "screen", id: "scr_2x4zw4" },
    { kind: "screen", id: "scr_ci4n2p" },
    { kind: "screen", id: "scr_pch8qn" },
    { kind: "screen", id: "scr_yexk8f" },
    { kind: "screen", id: "scr_p1vicg" }]
  }]

};