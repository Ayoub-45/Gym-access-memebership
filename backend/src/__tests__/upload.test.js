const upload = require('../middleware/upload');

describe('Upload Config Tests', () => {
  it('fileFilter accepts images', (done) => {
    const file = { mimetype: 'image/jpeg' };
    upload.fileFilter(null, file, (err, accept) => {
      expect(err).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('fileFilter rejects non-images', (done) => {
    const file = { mimetype: 'text/plain' };
    upload.fileFilter(null, file, (err, accept) => {
      expect(err.message).toBe('Seules les images sont autorisées!');
      expect(accept).toBe(false);
      done();
    });
  });

  it('has 5MB file limit', () => {
    expect(upload.limits.fileSize).toBe(5 * 1024 * 1024);
  });

  it('single upload middleware exists', () => {
    expect(typeof upload.single).toBe('function');
  });
});
