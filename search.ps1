
$searchTerms = @("checkout", "payment", "pay", "buyNow", "buy-now", "buy_now", "cart", "order", "orders", "placeOrder", "createOrder", "paymentSuccess", "paymentFailed", "paymentStatus", "transaction", "transactionId", "amount", "total", "subtotal", "shipping", "address", "delivery", "cod", "cash", "razorpay", "stripe", "paypal", "gateway", "webhook", "invoice")
$regex = ($searchTerms -join "|")
Select-String -Path "frontend/src/**/*.tsx", "frontend/src/**/*.ts", "shilp-sahayak-r2/src/**/*.ts" -Pattern $regex -List | Select-Object -ExpandProperty Path

