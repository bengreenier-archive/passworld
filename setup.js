/*
 * Dev setup script to configure azure as needed.
 * 
 * This will:
 * 1) login to azure
 * 2) create an AAD application
 * 3) add a "key" or client_secret to said application
 * 4) create a keyvault under a new resource group
 * 5) authorize the aad app to have full permisions to secrets in the keyvault
 * 6) output the client_id, client_secret of the AAD application, and the uri of the keyvault
 */


const msRestAzure = require('ms-rest-azure')
const GraphClient = require('azure-graph')
const prompt = require('prompt')
const moment = require('moment')
const uuid = require('uuid')

prompt.start()
prompt.get(['tenantId', 'displayName', 'hostUrl'], (err, res) => {
    msRestAzure.interactiveLogin({ tokenAudience: 'graph', domain: res.tenantId }, (err, c, s) => {
        if (err) throw err
        let graphClient = new GraphClient(c, res.tenantId)

        graphClient.applications.create({
            availableToOtherTenants: false,
            displayName: res.displayName,
            replyUrls: [res.hostUrl + '/auth/callback'],
            identifierUris: [res.hostUrl]
        }, (err, res) => {
            if (err) throw err

            let generationTime = moment()

            graphClient.applications.updatePasswordCredentials(res.objectId, [
                {
                    "starDate": generationTime.toISOString(),
                    "endDate": generationTime.add(1, "year").toISOString(),
                    "keyId": uuid.v4(),
                    "customKeyIdentifier": new Buffer(res.displayName + ' client secret').toString('base64'),
                    "value": null
                }
            ], (err, res) => {
                if (err) throw err


            })
        })
    })
})