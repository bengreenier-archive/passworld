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
const KvClient  = require('azure-arm-keyvault')
const RgClient = require('azure-arm-resource').ResourceManagementClient
const WebClient = require('azure-arm-website')
const prompt = require('prompt')
const moment = require('moment')
const uuid = require('uuid')

prompt.start()
prompt.get(['tenantId', 'subscriptionId', 'displayName', 'hostUrl', 'azureRegion'], (err, res) => {
    // login for graph
    new Promise((resolve, reject) => {
        msRestAzure.interactiveLogin({ tokenAudience: 'graph', domain: res.tenantId }, (err, c, s) => {
            if (err) throw err
            let graphClient = new GraphClient(c, res.tenantId)

            // create an aad app
            graphClient.applications.create({
                availableToOtherTenants: false,
                displayName: res.displayName,
                replyUrls: [res.hostUrl + '/auth/callback'],
                identifierUris: [res.hostUrl]
            }, (err, res) => {
                if (err) return reject(err)

                let app = res
                let generationTime = moment()

                // add a client_secret to that app
                graphClient.applications.updatePasswordCredentials(res.objectId, [
                    {
                        "starDate": generationTime.toISOString(),
                        "endDate": generationTime.add(1, "year").toISOString(),
                        "keyId": uuid.v4(),
                        "customKeyIdentifier": new Buffer(res.displayName + ' client secret').toString('base64'),
                        "value": new Buffer(uuid.v4() + uuid.v4()).toString('base64')
                    }
                ], (err, res) => {
                    if (err) return reject(err)

                    resolve(app)
                })
            })
        })
    }).then((aad) => {
        return new Promise((resolve, reject) => {
            msRestAzure.interactiveLogin({domain: res.tenantId }, (err, c, s) => {
                // create a resource group
                resolve(new Promise((resolve, reject) => {
                    let rgClient = new RgClient(c, res.subscriptionId)

                    rgClient.resourceGroups.createOrUpdate(res.displayName, {
                        location: res.azureRegion
                    }, (err, res) => {
                        if (err) return reject(err)
                        resolve({
                            aad: aad,
                            rg: res
                        })
                    })
                // create a keyvault (and grant our aad app access)
                }).then((aadAndRg) => {
                    return new Promise((resolve, reject) => {
                        let kvClient = new KvClient(c, res.subscriptionId)

                        kvClient.vaults.createOrUpdate(aadAndRg.rg.name, res.displayName, {
                            location: res.azureRegion,
                            properties: {
                                sku: {
                                    family: 'A',
                                    name: 'standard'
                                },
                                accessPolicies: [
                                    {
                                        tenantId: res.tenantId,
                                        objectId: aadAndRg.aad.objectId,
                                        permissions: {
                                            secrets: [
                                                'all'
                                            ]
                                        }
                                    }
                                ],
                                enabledForDeployment: false,
                                tenantId: res.tenantId
                            }
                        }, (err, res) => {
                            if (err) return reject(err)
                            resolve({
                                aad: aadAndRg.aad,
                                rg: aadAndRg.rg,
                                kv: res
                            })
                        })
                    })
                // create some compute
                }).then((aadAndRgAndKv) => {
                    return new Promise((resolve, reject) => {
                        let webClient = new WebClient(c, res.subscriptionId)

                        webClient.serverFarms.createOrUpdate(aadAndRgAndKv.rg, res.displayName, {}, (err, res) => {
                            if (err) return reject(err)
                            resolve({
                                aad: aadAndRgAndKv.aad,
                                rg: aadAndRgAndKv.rg,
                                kv: aadAndRgAndKv.kv,
                                web: res
                            })
                        })
                    })
                }))
            })
        })
    }).then(() => {
        console.log("done!")
    }, (err) => {
        console.error("error:", err);
    })
})