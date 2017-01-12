const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const passport = require('passport')
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy
const kv = require('azure-keyvault')
const Password = require('./lib/models/password')

// parse the secrets out of the runtime
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = process.env.REDIRECT_URI
const vaultUri = process.env.VAULT_URI
const identityUri = process.env.IDENTITY_URI || 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration'
const sessionSecret = process.env.SESSION_SECRET || "awopetiaepgfr"
const port = process.env.PORT || 3001

// configure our keyvault client
const createKvClient = (tokenType, accessToken) => {
    return kvClient = new kv.KeyVaultClient(new kv.KeyVaultCredentials((challenge, cb) => {
        return cb(null, `${tokenType} ${accessToken}`)
    }))
}

// authentication helper
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next()
    res.redirect('/auth')
}

// keyvault client helper
const ensureKvExists = (req, res, next) => {
    req.kv = createKvClient('Bearer', req.user.tokens.accessToken)
    next()
}

// configure our RESTful app
const app = express()

// configure our generic middleware
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    resave: true,
    saveUninitialized: false,
    secret: sessionSecret
}))
app.use(passport.initialize())
app.use(passport.session())

// configure our authentication middleware
const users = {}
passport.use(new OIDCStrategy({
    identityMetadata: identityUri,
    clientID: clientId,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: redirectUri,
    clientSecret: clientSecret,
    allowHttpForRedirectUrl: redirectUri.indexOf("https") === -1
  }, (iss, sub, profile, accessToken, refreshToken, done) => {
    profile.tokens = {
        accessToken,
        refreshToken
    }
    if (!profile.oid) {
        return done(new Error("No oid found"), null)
    }
    return done(null, profile)
}))

passport.serializeUser(function(user, done) {
    users[user.oid] = user;
    done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
  done(null, users[oid])
})

app.get('/auth',
    passport.authenticate('azuread-openidconnect', {failureRedirect: '/?failure=login', resourceURL: "https://vault.azure.net"}),
    (req, res) => {
        res.redirect('/')
})

app.post('/auth/callback',
    passport.authenticate('azuread-openidconnect', {failureRedirect: '/auth/failure', successRedirect: '/', resourceURL: "https://vault.azure.net"}),
    (req, res) => {
        res.redirect('/')
})

app.get('/auth/failure', (req, res) => {
    res.status(401).send("Oops! Auth is hard, something failed. Try <a href='/auth'>again</a>.")
})

app.get('/', ensureAuthenticated, (req, res) => {
    res.send(`Hi ${req.user.name.givenName}. See <a href='/passwords'>your passwords</a>.`)
})

app.get('/passwords', ensureAuthenticated, ensureKvExists, (req, response) => {
    req.kv.getSecrets(vaultUri, (err, res) => {
        if (err) return response.status(503).send(err)

        response.send(res.map((kvSecret) => {
            return new Password(kvSecret)
        }))
    })
})

app.get('/passwords/:name', ensureAuthenticated, ensureKvExists, (req, response) => {
    req.kv.getSecret(vaultUri +  (vaultUri.endsWith('/') ? '' : '/') + `secrets/${req.params.name}`, (err, res) => {
        if (err) return response.status(503).send(err)

        response.send(new Password(res))
    })
})

// takes an array of passwords
// {name: string, value: string, description: string, expiration: Date}
app.post('/passwords', ensureAuthenticated, ensureKvExists, bodyParser.json(), (req, response) => {
    if (!req.body || !req.body.length || req.body.length < 1) return response.status(400).send({error: "malformed"})

    var secretPromises = req.body.map((password) => {
        return [vaultUri].concat(new Password(
            password.name,
            password.value,
            password.description,
            password.expiration
        ).toKvArguments())
    }).map((args) => {
        return new Promise((resolve, reject) => {
            args.push((err, res) => {
                if (err) return reject(err)
                resolve(res)
            })
            req.kv.setSecret.call(req.kv, args)
        })
    })

    Promise.all(secretPromises).then(() => {
        response.status(200).end()
    }, (err) => {
        response.status(503).send(err)
    })
})

// start our app
const server = app.listen(port, () => {
    console.log(`Listening on [${server.address().address}]:${server.address().port}`)
})
