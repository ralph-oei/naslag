// Dunne wrapper om de Google Drive REST-API v3. De browser praat rechtstreeks met
// Drive met het token uit de makelaar (auth.js); niks loopt via een eigen server.
// Unit 2 gebruikt alleen `about`; het lezen van mappen/bestanden komt in unit 3.

const API = 'https://www.googleapis.com/drive/v3';

/** Token is verlopen/ongeldig (HTTP 401) → opnieuw inloggen. */
export class AuthError extends Error {}

/** GET tegen de Drive-API met Bearer-token. Gooit AuthError bij 401. */
export async function driveGet(path, token) {
  const res = await fetch(API + path, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) throw new AuthError('token verlopen');
  if (!res.ok) throw new Error('Drive ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.json();
}

/** De ingelogde gebruiker (naam + e-mail). */
export function about(token) {
  return driveGet('/about?fields=user(displayName,emailAddress,photoLink)', token);
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const isFolder = (item) => item.mimeType === FOLDER_MIME;

/** Alle directe kinderen van een map (mappen + bestanden), gepagineerd. `root` = My Drive-top. */
export async function listFolder(folderId, token) {
  let items = [];
  let pageToken;
  do {
    const p = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime)',
      pageSize: '1000',
      orderBy: 'folder,name',
    });
    if (pageToken) p.set('pageToken', pageToken);
    const res = await driveGet('/files?' + p.toString(), token);
    items = items.concat(res.files || []);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return items;
}

/** Ruwe tekstinhoud van een bestand (bv. een .md-notitie). */
export async function getFileText(fileId, token) {
  const res = await fetch(`${API}/files/${fileId}?alt=media`, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) throw new AuthError('token verlopen');
  if (!res.ok) throw new Error('Drive ' + res.status + ': ' + (await res.text()).slice(0, 200));
  return res.text();
}

/** Binaire inhoud van een bestand (bv. een afbeelding) als Blob. */
export async function getFileBlob(fileId, token) {
  const res = await fetch(`${API}/files/${fileId}?alt=media`, { headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) throw new AuthError('token verlopen');
  if (!res.ok) throw new Error('Drive ' + res.status);
  return res.blob();
}
