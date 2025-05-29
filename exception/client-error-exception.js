
class ClientErrorException extends Error {
    constructor(statusCode, bodyMessage) {
        super(bodyMessage);
        this.name = 'BadRequestException';
        this.statusCode = statusCode;
        this.body = { message: bodyMessage };
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ClientErrorException;