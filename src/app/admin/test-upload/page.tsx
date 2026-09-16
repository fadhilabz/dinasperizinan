"use client";

import {
  ChangeEvent,
  useState,
} from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

interface FileTest {
  id: string;
  nama_file: string;
  tipe_file: string;
  ukuran_file: number;
  file_data: string;
  created_at?: Timestamp;
}

const MAX_FILE_SIZE = 700 * 1024;

function fileToBase64(file: File): Promise<string> {
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

      // Hapus bagian:
      // data:application/pdf;base64,
      const base64 =
        result.split(",")[1];

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

function base64ToBlob(
  base64: string,
  mimeType: string
) {
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

  return new Blob(byteArrays, {
    type: mimeType,
  });
}

export default function TestFirestoreFilePage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [files, setFiles] =
    useState<FileTest[]>([]);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const selected =
      e.target.files?.[0] || null;

    setFile(selected);
    setMessage("");
    setError("");

    if (!selected) {
      return;
    }

    if (
      selected.size >
      MAX_FILE_SIZE
    ) {
      setError(
        `File terlalu besar. Maksimal ${(
          MAX_FILE_SIZE / 1024
        ).toFixed(0)} KB untuk test ini.`
      );
    }
  };

  const handleSave = async () => {
    if (!file) {
      setError(
        "Silakan pilih file terlebih dahulu."
      );
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setError(
        `File terlalu besar. Maksimal ${(
          MAX_FILE_SIZE / 1024
        ).toFixed(0)} KB.`
      );
      return;
    }

    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    const waktuMulai =
      performance.now();

    try {
      console.log(
        "=== FIRESTORE FILE TEST ==="
      );

      console.log(
        "Nama:",
        file.name
      );

      console.log(
        "Ukuran:",
        file.size,
        "bytes"
      );

      console.log(
        "Tipe:",
        file.type
      );

      // File → Base64
      const base64 =
        await fileToBase64(file);

      console.log(
        "Base64 berhasil dibuat."
      );

      // Simpan langsung ke Firestore
      const docRef =
        await addDoc(
          collection(
            db,
            "test_file_firestore"
          ),
          {
            nama_file:
              file.name,

            tipe_file:
              file.type ||
              "application/octet-stream",

            ukuran_file:
              file.size,

            file_data:
              base64,

            created_at:
              Timestamp.now(),
          }
        );

      const waktuSelesai =
        performance.now();

      const waktu =
        (
          (waktuSelesai -
            waktuMulai) /
          1000
        ).toFixed(2);

      console.log(
        "Firestore ID:",
        docRef.id
      );

      console.log(
        `Selesai dalam ${waktu} detik`
      );

      setMessage(
        `Berhasil disimpan ke Firestore dalam ${waktu} detik.`
      );

      setFile(null);

      const input =
        document.getElementById(
          "file-input"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadFiles();
    } catch (err) {
      console.error(
        "Gagal menyimpan file:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan file ke Firestore."
      );
    } finally {
      setSaving(false);
    }
  };

  const loadFiles = async () => {
    setLoading(true);

    try {
      const q = query(
        collection(
          db,
          "test_file_firestore"
        ),
        orderBy(
          "created_at",
          "desc"
        )
      );

      const snapshot =
        await getDocs(q);

      const hasil: FileTest[] =
        snapshot.docs.map(
          (item) => {
            const data =
              item.data();

            return {
              id: item.id,
              nama_file:
                data.nama_file ||
                "",
              tipe_file:
                data.tipe_file ||
                "",
              ukuran_file:
                data.ukuran_file ||
                0,
              file_data:
                data.file_data ||
                "",
              created_at:
                data.created_at,
            };
          }
        );

      setFiles(hasil);
    } catch (err) {
      console.error(
        "Gagal mengambil file:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = (
    item: FileTest
  ) => {
    try {
      const blob =
        base64ToBlob(
          item.file_data,
          item.tipe_file
        );

      const url =
        URL.createObjectURL(blob);

      window.open(
        url,
        "_blank"
      );

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error(err);

      setError(
        "Gagal membuka file."
      );
    }
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        "Hapus file test ini?"
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "test_file_firestore",
          id
        )
      );

      setMessage(
        "File berhasil dihapus."
      );

      await loadFiles();
    } catch (err) {
      console.error(
        "Gagal menghapus:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus file."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-800">
          Test File → Firestore
        </h1>

        <p className="mb-6 text-gray-600">
          Halaman ini tidak menggunakan
          Firebase Storage. File disimpan
          langsung sebagai Base64 di
          Firestore.
        </p>

        {/* FORM */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Upload File
          </h2>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">
              Pilih PDF / JPG / PNG
            </label>

            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={
                handleFileChange
              }
              disabled={saving}
              className="w-full rounded-lg border p-3"
            />
          </div>

          {file && (
            <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm">
              <p>
                <strong>
                  Nama:
                </strong>{" "}
                {file.name}
              </p>

              <p>
                <strong>
                  Ukuran:
                </strong>{" "}
                {(
                  file.size / 1024
                ).toFixed(2)}{" "}
                KB
              </p>

              <p>
                <strong>
                  Tipe:
                </strong>{" "}
                {file.type ||
                  "Tidak diketahui"}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={
              !file || saving
            }
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Menyimpan ke Firestore..."
              : "Simpan ke Firestore"}
          </button>

          {saving && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              File sedang dikonversi
              dan dikirim ke Firestore...
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* DAFTAR FILE */}
        <div className="rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              File di Firestore
            </h2>

            <button
              type="button"
              onClick={loadFiles}
              disabled={loading}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              {loading
                ? "Memuat..."
                : "Refresh"}
            </button>
          </div>

          {files.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              Belum ada file test.
              Klik Refresh setelah
              menyimpan file.
            </p>
          ) : (
            <div className="space-y-3">
              {files.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {item.nama_file}
                      </p>

                      <p className="text-sm text-gray-500">
                        {(
                          item.ukuran_file /
                          1024
                        ).toFixed(2)}{" "}
                        KB
                      </p>

                      <p className="text-xs text-gray-400">
                        {item.tipe_file}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenFile(
                            item
                          )
                        }
                        className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700"
                      >
                        Buka
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            item.id
                          )
                        }
                        className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}