import { describe, it, expect } from '@jest/globals';
import {
  profileInsertSchema,
  profileUpdateSchema,
  profileFormSchema,
  transformFormToInsert,
  transformFormToUpdate,
} from '@shared/src/validation/profileSchema';

describe('profileInsertSchema', () => {
  it('should accept valid profile data', () => {
    const validData = {
      username: 'testuser123',
      display_name: 'Test User',
      bio: 'This is a test bio',
      website: 'https://example.com',
      location: 'San Francisco, CA',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept partial data (all fields optional)', () => {
    const partialData = {
      username: 'testuser',
    };

    const result = profileInsertSchema.safeParse(partialData);
    expect(result.success).toBe(true);
  });

  it('should accept null values for optional fields', () => {
    const dataWithNulls = {
      username: null,
      display_name: null,
      bio: null,
      website: null,
      location: null,
      avatar_url: null,
    };

    const result = profileInsertSchema.safeParse(dataWithNulls);
    expect(result.success).toBe(true);
  });

  it('should reject username that is too short', () => {
    const invalidData = {
      username: 'ab',
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 3 characters');
    }
  });

  it('should reject username that is too long', () => {
    const invalidData = {
      username: 'a'.repeat(31),
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        'no more than 30 characters'
      );
    }
  });

  it('should reject username with invalid characters', () => {
    const invalidData = {
      username: 'test-user@123',
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        'letters, numbers, and underscores'
      );
    }
  });

  it('should accept username with underscores and numbers', () => {
    const validData = {
      username: 'user_123_name',
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject display_name that is too long', () => {
    const invalidData = {
      display_name: 'a'.repeat(101),
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        'no more than 100 characters'
      );
    }
  });

  it('should accept display_name at max length', () => {
    const validData = {
      display_name: 'a'.repeat(100),
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject bio that is too long', () => {
    const invalidData = {
      bio: 'a'.repeat(501),
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain(
        'no more than 500 characters'
      );
    }
  });

  it('should accept bio at max length', () => {
    const validData = {
      bio: 'a'.repeat(500),
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid website URL format', () => {
    const invalidData = {
      website: 'not-a-url',
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('valid URL');
    }
  });

  it('should reject website without http/https', () => {
    const invalidData = {
      website: 'ftp://example.com',
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept valid http URL', () => {
    const validData = {
      website: 'http://example.com',
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept valid https URL', () => {
    const validData = {
      website: 'https://example.com/path?query=1',
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid avatar_url', () => {
    const invalidData = {
      avatar_url: 'not-a-url',
    };

    const result = profileInsertSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('valid URL');
    }
  });

  it('should accept valid avatar_url', () => {
    const validData = {
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const result = profileInsertSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('profileUpdateSchema', () => {
  it('should accept valid update data', () => {
    const validData = {
      display_name: 'Updated Name',
    };

    const result = profileUpdateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept empty object (all fields optional)', () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should apply same validation rules as insert schema', () => {
    const invalidData = {
      username: 'ab', // too short
    };

    const result = profileUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('profileFormSchema', () => {
  it('should accept valid form data', () => {
    const validData = {
      username: 'testuser123',
      display_name: 'Test User',
      bio: 'Test bio',
      website: 'https://example.com',
      location: 'San Francisco',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const result = profileFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept empty strings (will be converted to null)', () => {
    const dataWithEmptyStrings = {
      username: '',
      display_name: '',
      bio: '',
      website: '',
      location: '',
      avatar_url: '',
    };

    const result = profileFormSchema.safeParse(dataWithEmptyStrings);
    expect(result.success).toBe(true);
  });

  it('should accept undefined fields', () => {
    const result = profileFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject username that is too short when provided', () => {
    const invalidData = {
      username: 'ab',
    };

    const result = profileFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept empty username string', () => {
    const validData = {
      username: '',
    };

    const result = profileFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid website when provided', () => {
    const invalidData = {
      website: 'not-a-url',
    };

    const result = profileFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept empty website string', () => {
    const validData = {
      website: '',
    };

    const result = profileFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should handle whitespace-only strings', () => {
    const dataWithWhitespace = {
      username: '   ',
      display_name: '   ',
      bio: '   ',
    };

    const result = profileFormSchema.safeParse(dataWithWhitespace);
    // Whitespace-only strings should be treated as empty
    expect(result.success).toBe(true);
  });
});

describe('transformFormToInsert', () => {
  it('should convert empty strings to null', () => {
    const formData = {
      username: '',
      display_name: '',
      bio: '',
      website: '',
      location: '',
      avatar_url: '',
    };

    const result = transformFormToInsert(formData);
    expect(result.username).toBeNull();
    expect(result.display_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.website).toBeNull();
    expect(result.location).toBeNull();
    expect(result.avatar_url).toBeNull();
  });

  it('should preserve non-empty strings', () => {
    const formData = {
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Test bio',
      website: 'https://example.com',
      location: 'San Francisco',
      avatar_url: 'https://example.com/avatar.jpg',
    };

    const result = transformFormToInsert(formData);
    expect(result.username).toBe('testuser');
    expect(result.display_name).toBe('Test User');
    expect(result.bio).toBe('Test bio');
    expect(result.website).toBe('https://example.com');
    expect(result.location).toBe('San Francisco');
    expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
  });

  it('should trim whitespace and convert to null if empty after trim', () => {
    const formData = {
      username: '   ',
      display_name: '   ',
      bio: '   ',
    };

    const result = transformFormToInsert(formData);
    expect(result.username).toBeNull();
    expect(result.display_name).toBeNull();
    expect(result.bio).toBeNull();
  });

  it('should trim whitespace but preserve value if not empty after trim', () => {
    const formData = {
      username: '  testuser  ',
      display_name: '  Test User  ',
    };

    const result = transformFormToInsert(formData);
    expect(result.username).toBe('testuser');
    expect(result.display_name).toBe('Test User');
  });

  it('should trim website, location, and avatar_url fields', () => {
    const formData = {
      website: '  https://example.com  ',
      location: '  San Francisco, CA  ',
      avatar_url: '  https://example.com/avatar.jpg  ',
    };

    const result = transformFormToInsert(formData);
    expect(result.website).toBe('https://example.com');
    expect(result.location).toBe('San Francisco, CA');
    expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
  });

  it('should convert trimmed empty website, location, and avatar_url to null', () => {
    const formData = {
      website: '   ',
      location: '   ',
      avatar_url: '   ',
    };

    const result = transformFormToInsert(formData);
    expect(result.website).toBeNull();
    expect(result.location).toBeNull();
    expect(result.avatar_url).toBeNull();
  });

  it('should handle undefined fields', () => {
    const formData = {
      username: 'testuser',
      // Other fields undefined
    };

    const result = transformFormToInsert(formData);
    expect(result.username).toBe('testuser');
    expect(result.display_name).toBeNull();
  });
});

describe('transformFormToUpdate', () => {
  it('should convert empty strings to null', () => {
    const formData = {
      username: '',
      display_name: '',
    };

    const result = transformFormToUpdate(formData);
    expect(result.username).toBeNull();
    expect(result.display_name).toBeNull();
  });

  it('should preserve non-empty strings', () => {
    const formData = {
      display_name: 'Updated Name',
      bio: 'Updated bio',
    };

    const result = transformFormToUpdate(formData);
    expect(result.display_name).toBe('Updated Name');
    expect(result.bio).toBe('Updated bio');
  });

  it('should have same behavior as transformFormToInsert', () => {
    const formData = {
      username: 'testuser',
      display_name: 'Test User',
    };

    const insertResult = transformFormToInsert(formData);
    const updateResult = transformFormToUpdate(formData);

    expect(insertResult.username).toBe(updateResult.username);
    expect(insertResult.display_name).toBe(updateResult.display_name);
  });

  it('should trim website, location, and avatar_url in update transform', () => {
    const formData = {
      website: '  https://example.com  ',
      location: '  New York  ',
      avatar_url: '  https://example.com/new-avatar.jpg  ',
    };

    const result = transformFormToUpdate(formData);
    expect(result.website).toBe('https://example.com');
    expect(result.location).toBe('New York');
    expect(result.avatar_url).toBe('https://example.com/new-avatar.jpg');
  });
});
