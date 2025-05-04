# Polar React Native Starter

### Setup a simple backend

```typescript
const express = require("express");
const app = express();
const { Polar } = require("@polar-sh/sdk");

app.post("/checkout", async (req, res) => {
  // Fetch the Stripe customer ID for the customer associated with this request.
  // This assumes your app has an existing user database, which we'll call `myUserDB`.
  const user = myUserDB.getUserFromToken(req.query.token);

  const session = await polar.checkouts.create({
    products: req.query.products,
    customerExternalId: user.id,
    successUrl: "https://example.com/checkout_redirect/success",
  });

  res.json({ url: session.url });
});

app.post("/login", async (req, res) => {
  // This assumes your app has an existing user database, which we'll call `myUserDB`.
  const token = myUserDB.login(req.body.login_details);
  res.json({ token: token });
});

app.listen(4242, () => console.log(`Listening on port ${4242}!`));
```

### Register App Links

#### Apple iOS

Add a file to your domain at .well-known/apple-app-site-association to define the URLs your app handles. Prepend your App ID with your Team ID, which you can find on the Membership page of the Apple Developer Portal.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": [
          "A28BC3DEF9.com.example.MyApp1",
          "A28BC3DEF9.com.example.MyApp1-Debug"
        ],
        "components": [
          {
            "/": "/checkout_redirect*",
            "comment": "Matches any URL whose path starts with /checkout_redirect"
          }
        ]
      }
    ]
  }
}
```

#### Android

You can learn more about adding App Links to your Expo Project [here](https://docs.expo.dev/linking/android-app-links/).
