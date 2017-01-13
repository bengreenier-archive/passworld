# passworld

A share-able password vault powered by microsoft tech

## Hosting

If you want to set this up for yourself, here's how:

+ [deploy this code](https://azuredeploy.net) to a new `web app`, inside a `resource group`
+ visit [portal.azure.com](https://portal.azure.com)
+ create a new `key vault`, inside the `resource group` that was created above
+ navigate to AAD, then App Registrations
+ create an add app (of type web app) - use `https://<yourAzureWebAppName>.azurewebsites.net/auth/callback` for the `sign on url`
+ (optional) register a `replyUrl` for the aad app, allowing return to `localhost:3001/auth/callback` for development
+ edit the manifest of your aad app to include the following under `requiredResourceAccess` as a new entry in the array: ```{
      "resourceAppId": "cfa8b339-82a2-471a-a3c9-0fc0be7a4093",
      "resourceAccess": [
        {
          "id": "f53da476-18e3-4152-8e01-aec403e6edc0",
          "type": "Scope"
        }
      ]
    }``` this allows your application to issue tokens for keyvault on behalf of users
+ add a `key` that your web app will use to authenticate, and copy it's value
+ navigate to the `application settings` for your web app, and paste this value under the key `CLIENT_SECRET`
+ repeat the process, copying the aad app `application id`, and paste it under the key `CLIENT_ID`
+ under the key `REDIRECT_URI`, paste the value entered above, as the aad `replyUrl`
+ under the key `VAULT_URI`, enter the value `<nameOfCreatedKeyVault>.vault.azure.net`
+ (optional) under the key `SESSION_SECRET`, enter some unique value to salt user session keys with
+ (optional) if you know what you're doing, and want to use another openid well known configuration, paste it's uri under the key `IDENTITY_URI`
+ navigate to the `access policies` for your key vault, and add security groups, and/or individuals whom you wish to have access to your passwords -
grant these users `get`, `list`, and `set` secret permissions.
+ direct users to `https://<yourAzureWebAppName>.azurewebsites.net`

### Troubleshooting

#### Authentication fails

AAD is extremely finicky. I found in practice that my aad application was a v1 application, and therefore does not work
with the default `IDENTITY_URI`. I ended up using `https://login.microsoftonline.com/benbengreenier.onmicrosoft.com/.well-known/openid-configuration`
which is a v1 identity provider specfically for my organization. You may have luck using the same (replacing benbengreenier with your org name),
or you might try `https://login.microsoftonline.com/common/.well-known/openid-configuration`.

### AADSTS65005

> Error message: The client application has requested access to resource 'https://vault.azure.net'.
This request has failed because the client has not specified this resource in its requiredResourceAccess list.

This can occur if you haven't correctly allowed aad to issue tokens for keyvault on behalf of users.
See [this SO question](http://stackoverflow.com/questions/30096576/using-adal-for-accessing-the-azure-keyvault-on-behalf-of-a-user/41603433#41603433).

## License

MIT
