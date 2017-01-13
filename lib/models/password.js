module.exports = class Password {
    constructor(kvSecretOrName, value, description, expiration) {
        if (typeof (kvSecretOrName) === 'object') {
            let idParts = kvSecretOrName.id.split('/')
            this._name = idParts[idParts.length - 1]
            this._value = kvSecretOrName.value || null
            this._desc = kvSecretOrName.tags.description
            this._exp = new Date(kvSecretOrName.attributes.expires)
        } else {
            this._name = kvSecretOrName
            this._value = value
            this._desc = description
            this._exp = new Date(expiration)
        }
    }

    toKvArguments() {
        return [this.name, this.value, {
            secretAttributes: {
                enabled: true,
                expires: this.expiration
            },
            tags: {
                description: this.description
            }
        }]
    }

    toJSON() {
        return JSON.stringify({
            name: this.name,
            value: this.value,
            description: this.description,
            expiration: this.expiration
        })
    }

    get name () { return this._name }
    get value () { return this._value }
    get description () { return this._desc }
    get expiration () { return this._exp }
}