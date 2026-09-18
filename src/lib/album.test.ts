import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FAMILY_ALBUM_LABEL,
  addPageToBook,
  albumRelativePath,
  buildAlbumBook,
  buildAlbumPage,
  defaultAlbumTitle,
  guessPhotoExt,
  isManagedAlbumRef,
  normalizeAlbumBook,
  normalizeAlbumBooks,
  normalizeAlbumPage,
  patchPageInBook,
  removeAlbumBookById,
  removePageFromBook,
  resolveStoredPhotoRef,
  toStoredPhotoRef,
  upsertAlbumBook,
} from './album.ts';

const makeId = (() => {
  let n = 0;
  return () => {
    n += 1;
    return `id${n}`;
  };
})();

describe('album titles and photo refs', () => {
  it('falls back to 我家的书 when title is blank', () => {
    assert.equal(defaultAlbumTitle(''), FAMILY_ALBUM_LABEL);
    assert.equal(defaultAlbumTitle('  '), FAMILY_ALBUM_LABEL);
    assert.equal(defaultAlbumTitle('小猫的一天'), '小猫的一天');
  });

  it('guesses photo extensions and defaults to jpg', () => {
    assert.equal(guessPhotoExt('file:///tmp/a.JPEG?w=1'), '.jpg');
    assert.equal(guessPhotoExt('ph://asset/IMG.HEIC'), '.heic');
    assert.equal(guessPhotoExt('file:///tmp/no-ext'), '.jpg');
    assert.equal(albumRelativePath('book1', 'page1', '.png'), 'albums/book1/page1.png');
  });

  it('stores relative paths under the app documents directory', () => {
    const root = 'file:///docs/';
    assert.equal(toStoredPhotoRef('file:///docs/albums/b/p.jpg', root), 'albums/b/p.jpg');
    assert.equal(toStoredPhotoRef('file:///cache/tmp.jpg', root), 'file:///cache/tmp.jpg');
    assert.equal(resolveStoredPhotoRef('albums/b/p.jpg', root), 'file:///docs/albums/b/p.jpg');
    assert.equal(resolveStoredPhotoRef('file:///docs/albums/b/p.jpg', root), 'file:///docs/albums/b/p.jpg');
    assert.equal(isManagedAlbumRef('albums/b/p.jpg', root), true);
    assert.equal(isManagedAlbumRef('file:///docs/albums/b/p.jpg', root), true);
    assert.equal(isManagedAlbumRef('file:///cache/tmp.jpg', root), false);
  });
});

describe('album normalize and persist shape', () => {
  it('drops invalid pages and books', () => {
    assert.equal(normalizeAlbumPage(null), null);
    assert.equal(normalizeAlbumPage({ id: 'p1' }), null);
    const page = normalizeAlbumPage({
      id: 'p1',
      photoUri: '  albums/b/p.jpg  ',
      caption: 'This is my cat.',
    });
    assert.deepEqual(page, {
      id: 'p1',
      photoUri: 'albums/b/p.jpg',
      caption: 'This is my cat.',
      captionZh: '',
      recordingUri: null,
    });

    const book = normalizeAlbumBook({
      id: 'b1',
      title: '  ',
      pages: [page, { id: 'bad' }, null],
      createdAt: '2026-09-18',
    });
    assert.equal(book?.title, FAMILY_ALBUM_LABEL);
    assert.equal(book?.pages.length, 1);

    const withVoice = normalizeAlbumPage({
      id: 'p2',
      photoUri: 'albums/b/p2.jpg',
      recordingUri: '  recordings/albums/b/p2.m4a  ',
    });
    assert.equal(withVoice?.recordingUri, 'recordings/albums/b/p2.m4a');

    assert.deepEqual(normalizeAlbumBooks('nope'), []);
    assert.equal(normalizeAlbumBooks([{ id: 'ok', pages: [] }])[0]?.id, 'ok');
    assert.equal(normalizeAlbumBooks([{ title: 'no-id' }]).length, 0);
  });

  it('builds, edits and removes books and pages', () => {
    const now = () => 't0';
    const ids = makeId;
    const page = buildAlbumPage(
      { photoUri: 'albums/b/p.jpg', caption: 'Hello.', captionZh: '你好。' },
      ids,
    );
    const book = buildAlbumBook({ title: '我家的一天', pages: [page] }, ids, now);
    assert.equal(book.pages[0]?.captionZh, '你好。');

    const added = addPageToBook(
      book,
      buildAlbumPage({ photoUri: 'albums/b/p2.jpg', caption: 'Again.' }, ids),
    );
    assert.equal(added.pages.length, 2);

    const patched = patchPageInBook(added, page.id, { caption: 'This is my cat.' });
    assert.equal(patched.pages[0]?.caption, 'This is my cat.');
    assert.equal(patched.pages[0]?.captionZh, '你好。');
    assert.equal(patched.pages[0]?.recordingUri, null);

    const withVoice = patchPageInBook(patched, page.id, {
      recordingUri: 'recordings/albums/b/p.m4a',
    });
    assert.equal(withVoice.pages[0]?.recordingUri, 'recordings/albums/b/p.m4a');
    const clearedVoice = patchPageInBook(withVoice, page.id, { recordingUri: null });
    assert.equal(clearedVoice.pages[0]?.recordingUri, null);

    const trimmed = removePageFromBook(patched, page.id);
    assert.equal(trimmed.pages.length, 1);

    const list = upsertAlbumBook([], book);
    assert.equal(list.length, 1);
    const updated = upsertAlbumBook(list, { ...book, title: '新名字', createdAt: 'later' });
    assert.equal(updated[0]?.title, '新名字');
    assert.equal(updated[0]?.createdAt, 't0');
    assert.equal(removeAlbumBookById(updated, book.id).length, 0);
  });
});
