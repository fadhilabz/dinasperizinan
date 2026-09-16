import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type JenisSurat =
  | "surat_masuk"
  | "surat_keluar";

const MAX_FILE_SIZE = 500 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export interface FileFirestore {
  file_data: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

/**
 * Validasi file sebelum diproses.
 */
function validasiFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Ukuran file maksimal 500 KB karena file disimpan langsung di Firestore."
    );
  }

  if (
    file.type &&
    !ALLOWED_TYPES.includes(file.type)
  ) {
    throw new Error(
      "File harus berupa PDF, JPG, JPEG, atau PNG."
    );
  }
}

/**
 * Mengubah File menjadi Base64.
 */
function fileToBase64(
  file: File
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(
          new Error("Gagal membaca file.")
        );
        return;
      }

      const parts = result.split(",");

      if (parts.length < 2 || !parts[1]) {
        reject(
          new Error("Format file tidak valid.")
        );
        return;
      }

      resolve(parts[1]);
    };

    reader.onerror = () => {
      reject(
        new Error("Gagal membaca file.")
      );
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Menyiapkan file sebelum disimpan ke Firestore.
 */
async function siapkanFile(
  file: File
): Promise<FileFirestore> {
  validasiFile(file);

  const file_data =
    await fileToBase64(file);

  return {
    file_data,
    file_name: file.name,
    file_type:
      file.type ||
      "application/octet-stream",
    file_size: file.size,
  };
}

/**
 * Menambahkan surat baru.
 *
 * File diproses terlebih dahulu.
 * Jika file gagal dibaca atau validasi gagal,
 * data surat tidak akan dibuat di Firestore.
 */
export async function tambahSurat(
  jenis: JenisSurat,
  data: Record<string, unknown>,
  file?: File | null
) {
  let fileData:
    | FileFirestore
    | null = null;

  if (file) {
    fileData = await siapkanFile(file);
  }

  const hasil = await addDoc(
    collection(db, jenis),
    {
      ...data,

      ...(fileData
        ? {
            file_data:
              fileData.file_data,

            file_name:
              fileData.file_name,

            file_type:
              fileData.file_type,

            file_size:
              fileData.file_size,
          }
        : {
            file_data: "",
            file_name: "",
            file_type: "",
            file_size: 0,
          }),

      created_at:
        serverTimestamp(),
    }
  );

  return hasil.id;
}

/**
 * Mengubah data surat.
 *
 * Jika ada file baru:
 * - file lama diganti dengan file baru.
 *
 * Jika tidak ada file baru:
 * - file lama tetap dipertahankan.
 */
export async function updateSurat(
  jenis: JenisSurat,
  id: string,
  data: Record<string, unknown>,
  file?: File | null
) {
  let fileData:
    | FileFirestore
    | null = null;

  if (file) {
    fileData = await siapkanFile(file);
  }

  await updateDoc(
    doc(db, jenis, id),
    {
      ...data,

      ...(fileData
        ? {
            file_data:
              fileData.file_data,

            file_name:
              fileData.file_name,

            file_type:
              fileData.file_type,

            file_size:
              fileData.file_size,
          }
        : {}),

      updated_at:
        serverTimestamp(),
    }
  );
}

/**
 * Menghapus surat.
 *
 * Karena file disimpan di dokumen Firestore yang sama,
 * menghapus dokumen otomatis menghapus metadata dan file.
 */
export async function hapusSurat(
  jenis: JenisSurat,
  id: string
) {
  await deleteDoc(
    doc(db, jenis, id)
  );
}

/**
 * Mengubah status surat.
 */
export async function ubahStatusSurat(
  jenis: JenisSurat,
  id: string,
  status: string
) {
  await updateDoc(
    doc(db, jenis, id),
    {
      status,

      updated_at:
        serverTimestamp(),
    }
  );
}

/**
 * Mengubah Base64 menjadi URL Blob
 * untuk membuka file di browser.
 *
 * Dibuat menggunakan ArrayBuffer agar kompatibel
 * dengan TypeScript / Next.js versi terbaru.
 */
export function base64ToUrl(
  base64: string,
  mimeType: string
): string {
  const byteCharacters =
    atob(base64);

  const byteNumbers =
    new Array<number>(
      byteCharacters.length
    );

  for (
    let i = 0;
    i < byteCharacters.length;
    i++
  ) {
    byteNumbers[i] =
      byteCharacters.charCodeAt(i);
  }

  const byteArray =
    new Uint8Array(byteNumbers);

  /**
   * Buat ArrayBuffer baru.
   *
   * Ini sengaja dilakukan agar tipe buffer
   * menjadi ArrayBuffer yang kompatibel dengan
   * BlobPart pada TypeScript terbaru.
   */
  const buffer =
    new ArrayBuffer(
      byteArray.byteLength
    );

  new Uint8Array(buffer).set(
    byteArray
  );

  const blob = new Blob(
    [buffer],
    {
      type:
        mimeType ||
        "application/octet-stream",
    }
  );

  return URL.createObjectURL(blob);
}