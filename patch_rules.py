
import re

with open("firestore.rules", "r") as f:
    content = f.read()

new_reviews_block = """      match /reviews/{reviewId} {
        allow read: if true;
        
        allow create: if isSignedIn()
          && reviewId == request.auth.uid + "_" + request.resource.data.orderId + "_" + productId
          && request.resource.data.userId == request.auth.uid
          && request.resource.data.productId == productId
          && request.resource.data.status == "pending"
          && request.resource.data.verifiedPurchase == true
          && exists(/databases/$(database)/documents/orders/$(request.resource.data.orderId))
          && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId)).data.customerId == request.auth.uid
          && productId in get(/databases/$(database)/documents/orders/$(request.resource.data.orderId)).data.productIds
          && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId)).data.status in ["Delivered", "Completed", "Shipped"];
          
        allow update: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(["rating", "reviewText", "updatedAt"]));
        
        allow delete: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      }"""

content = re.sub(r"match /reviews/\{reviewId\}.*?allow delete:.*?\n\s+\}", new_reviews_block, content, flags=re.DOTALL)

with open("firestore.rules", "w") as f:
    f.write(content)

