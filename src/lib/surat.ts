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

      const base64 =
        result.split(",")[1];

      if (!base64) {
        reject(
          new Error(
            "Format file tidak valid."
          )
        );
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(
        new Error("Gagal membaca file.")
      );
    };

    reader.readAsDataURL(file);
  });
}

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

export async function tambahSurat(
  jenis: JenisSurat,
  data: Record<string, unknown>,
  file?: File | null
) {
  let fileData:
    | FileFirestore
    | null = null;

  /*
   * File diproses terlebih dahulu.
   *
   * Kalau gagal membaca / validasi file,
   * addDoc tidak akan dijalankan.
   */
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

export async function updateSurat(
  jenis: JenisSurat,
  id: string,
  data: Record<string, unknown>,
  file?: File | null
) {
  let fileData:
    | FileFirestore
    | null = null;

  /*
   * Kalau user memilih file baru,
   * proses file terlebih dahulu.
   */
  if (file) {
    fileData = await siapkanFile(file);
  }

  await updateDoc(
    doc(db, jenis, id),
    {
      ...data,

      /*
       * Jika file baru ada,
       * file lama diganti.
       *
       * Jika tidak ada,
       * field file tidak disentuh.
       */
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

export async function hapusSurat(
  jenis: JenisSurat,
  id: string
) {
  await deleteDoc(
    doc(db, jenis, id)
  );
}

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

export function base64ToUrl(
  base64: string,
  mimeType: string
): string {
  const byteCharacters =
    atob(base64);

  const byteArrays: Uint8Array[] = [];

  const sliceSize = 1024;

  for (
    let offset = 0;
    offset < byteCharacters.length;
    offset += sliceSize
  ) {
    const slice =
      byteCharacters.slice(
        offset,
        offset + sliceSize
      );

    const byteNumbers =
      new Array(slice.length);

    for (
      let i = 0;
      i < slice.length;
      i++
    ) {
      byteNumbers[i] =
        slice.charCodeAt(i);
    }

    byteArrays.push(
      new Uint8Array(byteNumbers)
    );
  }

  const blob = new Blob(
    byteArrays,
    {
      type:
        mimeType ||
        "application/octet-stream",
    }
  );

  return URL.createObjectURL(blob);
}