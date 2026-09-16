"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase";
import {
  base64ToUrl,
  hapusSurat,
  ubahStatusSurat,
} from "@/lib/surat";

interface SuratKeluar {
  id: string;
  nomor_surat: string;
  tanggal_surat: string;
  tujuan: string;
  perihal: string;
  sifat_surat: string;
  status: string;
  file_data: string;
  file_name: string;
  file_type: string;
}

function formatStatus(status: string) {
  if (status === "diproses") return "Diproses";
  if (status === "selesai") return "Selesai";
  return "Belum Diproses";
}

function statusClass(status: string) {
  if (status === "selesai") {
    return "bg-green-100 text-green-700";
  }

  if (status === "diproses") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default function Page() {
  const router = useRouter();

  const [data, setData] = useState<SuratKeluar[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);

      let snapshot;

      try {
        const q = query(
          collection(db, "surat_keluar"),
          orderBy("created_at", "desc")
        );

        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocs(
          collection(db, "surat_keluar")
        );
      }

      const hasil: SuratKeluar[] =
        snapshot.docs.map((item) => {
          const d = item.data();

          return {
            id: item.id,
            nomor_surat:
              d.nomor_surat || "",
            tanggal_surat:
              d.tanggal_surat ||
              d.tanggal ||
              "",
            tujuan:
              d.tujuan ||
              d.pihak ||
              "",
            perihal:
              d.perihal || "",
            sifat_surat:
              d.sifat_surat ||
              "Biasa",
            status:
              d.status ||
              "belum_diproses",
            file_data:
              d.file_data || "",
            file_name:
              d.file_name || "",
            file_type:
              d.file_type || "",
          };
        });

      setData(hasil);
    } catch (error) {
      console.error(error);
      alert("Gagal mengambil data surat keluar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: string) {
    const yakin = confirm(
      "Yakin ingin menghapus surat ini?"
    );

    if (!yakin) return;

    try {
      await hapusSurat(
        "surat_keluar",
        id
      );

      setData((prev) =>
        prev.filter((item) => item.id !== id)
      );

      alert("Surat berhasil dihapus.");
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus surat.");
    }
  }

  async function handleStatusChange(
    id: string,
    status: string
  ) {
    try {
      await ubahStatusSurat(
        "surat_keluar",
        id,
        status
      );

      setData((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("Gagal mengubah status.");
    }
  }

  function handleOpenFile(item: SuratKeluar) {
    if (!item.file_data) {
      alert("Surat ini belum memiliki file.");
      return;
    }

    try {
      const url = base64ToUrl(
        item.file_data,
        item.file_type
      );

      window.open(url, "_blank");

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error(error);
      alert("Gagal membuka file.");
    }
  }

  const filteredData = data.filter((item) => {
    const keyword =
      search.toLowerCase();

    return (
      item.nomor_surat
        .toLowerCase()
        .includes(keyword) ||
      item.tujuan
        .toLowerCase()
        .includes(keyword) ||
      item.perihal
        .toLowerCase()
        .includes(keyword)
    );
  });

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-full">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Daftar Surat Keluar
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Semua surat keluar yang tersimpan di
              Firestore.
            </p>
          </div>

          <button
            onClick={() =>
              router.push(
                "/admin/surat-keluar/tambah"
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            + Tambah Surat
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 shadow">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Cari nomor surat, tujuan, atau perihal..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Memuat data...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Belum ada surat keluar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-sm text-gray-600">
                    <th className="px-4 py-3">
                      No
                    </th>

                    <th className="px-4 py-3">
                      Nomor Surat
                    </th>

                    <th className="px-4 py-3">
                      Tanggal
                    </th>

                    <th className="px-4 py-3">
                      Tujuan
                    </th>

                    <th className="px-4 py-3">
                      Perihal
                    </th>

                    <th className="px-4 py-3">
                      Sifat
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      File
                    </th>

                    <th className="px-4 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.map(
                    (item, index) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 text-sm font-medium">
                          {item.nomor_surat}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {item.tanggal_surat}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {item.tujuan}
                        </td>

                        <td className="max-w-[250px] px-4 py-3 text-sm">
                          {item.perihal}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          {item.sifat_surat}
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(
                                item.id,
                                e.target.value
                              )
                            }
                            className={`rounded-full border-0 px-3 py-1 text-xs font-medium outline-none ${statusClass(
                              item.status
                            )}`}
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

                          <div className="mt-1 text-xs text-gray-400">
                            {formatStatus(
                              item.status
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {item.file_data ? (
                            <button
                              onClick={() =>
                                handleOpenFile(
                                  item
                                )
                              }
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Lihat File
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Tidak ada
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/surat-keluar/tambah?id=${item.id}`
                                )
                              }
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  item.id
                                )
                              }
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}