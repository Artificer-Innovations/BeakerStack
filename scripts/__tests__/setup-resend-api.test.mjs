import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isDomainAlreadyRegisteredError } from '../lib/setup-resend-api.mjs';

describe('isDomainAlreadyRegisteredError', () => {
  it('accepts HTTP 409', () => {
    assert.equal(
      isDomainAlreadyRegisteredError({ status: 409, message: 'Conflict' }),
      true
    );
  });

  it('accepts HTTP 403 validation_error for registered already', () => {
    const err = {
      status: 403,
      message:
        'Resend POST /domains → 403: {"statusCode":403,"message":"The auth.beakerstack.com domain has been registered already.","name":"validation_error"}',
    };
    assert.equal(isDomainAlreadyRegisteredError(err), true);
  });

  it('rejects unrelated 403 errors', () => {
    assert.equal(
      isDomainAlreadyRegisteredError({
        status: 403,
        message: 'Resend POST /domains → 403: forbidden',
      }),
      false
    );
  });
});
