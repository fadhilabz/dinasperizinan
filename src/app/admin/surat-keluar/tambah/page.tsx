"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

import { db } from "@/lib/firebase";
import {
  tambahSurat,
  updateSurat,
} from "@/lib/surat";

function TambahSuratKeluarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editingId = searchParams.get("id");

  const [nomorSurat, setNomorSurat] = useState("");
  const [tanggalSurat, setTanggalSurat] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [perihal, setPerihal] = useState("");
  const [sifatSurat, setSifatSurat] = useState("Biasa");
  const [status, setStatus] = useState("belum_diproses");

  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState("");

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(editingId);

  useEffect(() => {
    async function loadData() {
      if (!editingId) return;

      try {
        setLoadingData(true);

        const ref = doc(
          db,
          "surat_keluar",
          editingId
        );

        const snapshot = await getDoc(ref);

        if (!snapshot.exists()) {
          alert("Data surat tidak ditemukan.");
          router.push("/admin/surat-keluar/daftar");
          return;
        }

        const data = snapshot.data();

        setNomorSurat(
          data.nomor_surat || ""
        );

        setTanggalSurat(
          data.tanggal_surat ||
            data.tanggal ||
            ""
        );

        setTujuan(
          data.tujuan ||
            data.pihak ||
            ""
        );

        setPerihal(
          data.perihal || ""
        );

        setSifatSurat(
          data.sifat_surat || "Biasa"
        );

        setStatus(
          data.status || "belum_diproses"
        );

        setExistingFileName(
          data.file_name || ""
        );
      } catch (error) {
        console.error(error);
        alert("Gagal mengambil data surat.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [editingId, router]);

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!nomorSurat.trim()) {
      alert("Nomor surat wajib diisi.");
      return;
    }

    if (!tanggalSurat) {
      alert("Tanggal surat wajib diisi.");
      return;
    }

    if (!tujuan.trim()) {
      alert("Tujuan surat wajib diisi.");
      return;
    }

    if (!perihal.trim()) {
      alert("Perihal wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      const data = {
        nomor_surat: nomorSurat.trim(),
        tanggal_surat: tanggalSurat,
        tujuan: tujuan.trim(),
        perihal: perihal.trim(),
        sifat_surat: sifatSurat,
        status,
      };

      if (editingId) {
        await updateSurat(
          "surat_keluar",
          editingId,
          data,
          file
        );

        alert("Surat keluar berhasil diperbarui.");
      } else {
        await tambahSurat(
          "surat_keluar",
          data,
          file
        );

        alert("Surat keluar berhasil ditambahkan.");
      }

      router.push("/admin/surat-keluar/daftar");
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan.";

      alert(message);
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-center shadow">
          Memuat data surat...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-4xl">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEdit
                ? "Edit Surat Keluar"
                : "Tambah Surat Keluar"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola data surat keluar.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/surat-keluar/daftar"
              )
            }
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Daftar Surat
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white p-6 shadow"
        >
          <div className="grid gap-5 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nomor Surat
              </label>

              <input
                type="text"
                value={nomorSurat}
                onChange={(e) =>
                  setNomorSurat(e.target.value)
                }
                placeholder="Contoh: 001/SK/IX/2026"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tanggal Surat
              </label>

              <input
                type="date"
                value={tanggalSurat}
                onChange={(e) =>
                  setTanggalSurat(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tujuan
              </label>

              <input
                type="text"
                value={tujuan}
                onChange={(e) =>
                  setTujuan(e.target.value)
                }
                placeholder="Nama instansi/tujuan"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sifat Surat
              </label>

              <select
                value={sifatSurat}
                onChange={(e) =>
                  setSifatSurat(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="Biasa">Biasa</option>
                <option value="Penting">Penting</option>
                <option value="Segera">Segera</option>
                <option value="Rahasia">Rahasia</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Perihal
              </label>

              <textarea
                value={perihal}
                onChange={(e) =>
                  setPerihal(e.target.value)
                }
                rows={4}
                placeholder="Masukkan perihal surat"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="belum_diproses">
                  Belum Diproses
                </option>

                <option value="diproses">
                  Diproses
                </option>

                <option value="selesai">
                  Selesai
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                File Surat
              </label>

              {existingFileName && (
                <div className="mb-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
                  File saat ini:{" "}
                  <strong>{existingFileName}</strong>
                </div>
              )}

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] || null
                  )
                }
                className="block w-full rounded-lg border border-gray-300 bg-white text-sm"
              />

              <p className="mt-2 text-xs text-gray-500">
                Maksimal 500 KB. Format: PDF, JPG,
                JPEG, PNG.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/surat-keluar/daftar"
                )
              }
              className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : isEdit
                ? "Simpan Perubahan"
                : "Simpan Surat"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 p-6">
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-center shadow">
            Memuat...
          </div>
        </main>
      }
    >
      <TambahSuratKeluarContent />
    </Suspense>
  );
}