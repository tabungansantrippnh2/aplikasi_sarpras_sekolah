import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { QRCodeCanvas } from "qrcode.react";

const kondisiList = ["Baik", "Rusak Ringan", "Rusak Berat"];

const usersDefault = {
  admin: { username: "admin", password: "admin", role: "admin" },
  sarpras: { username: "sarpras", password: "sarpras", role: "operator" },
  kepsek: { username: "kepsek", password: "kepsek", role: "kepala" }
};

type Item = {
  id: number;
  kode: string;
  nama: string;
  jumlah: number;
  kondisi: string;
  lokasi: string;
  kategori: string;
  asal: string;
  tahun: string;
};

type ItemUI = Item & { foto?: string };

export default function AplikasiSarprasSekolah() {
  const [items, setItems] = useState<Item[]>([]);
  const [itemsUI, setItemsUI] = useState<ItemUI[]>([]);
  const [form, setForm] = useState<Omit<ItemUI, "id">>({
    kode: "",
    nama: "",
    jumlah: 0,
    kondisi: "Baik",
    lokasi: "",
    kategori: "",
    asal: "",
    tahun: "",
    foto: ""
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [login, setLogin] = useState({ username: "", password: "" });

  useEffect(() => {
    const u = localStorage.getItem("loginUser");
    if (u) setUser(JSON.parse(u));
    const data = localStorage.getItem("sarpras");
    if (data) {
      const parsed: Item[] = JSON.parse(data);
      setItems(parsed);
      setItemsUI(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sarpras", JSON.stringify(items));
  }, [items]);

  const handleLogin = () => {
    const found = Object.values(usersDefault).find(
      (u: any) => u.username === login.username && u.password === login.password
    );
    if (!found) return alert("Login gagal");
    localStorage.setItem("loginUser", JSON.stringify(found));
    setUser(found);
  };

  const logout = () => {
    localStorage.removeItem("loginUser");
    setUser(null);
  };

  const exportExcel = async (data: ItemUI[], filename: string) => {
    if (data.length === 0) return alert("Data kosong");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(data.map(({ foto, ...rest }) => rest));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importExcel = async (file: File) => {
    const XLSX = await import("xlsx");
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Item[] = XLSX.utils.sheet_to_json(ws);
    setItems(json);
    setItemsUI(json);
  };

  const exportPDF = async (data: ItemUI[], filename: string) => {
    if (data.length === 0) return alert("Data kosong");
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.text("Laporan Sarana dan Prasarana", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Kode", "Nama", "Jumlah", "Kondisi", "Lokasi", "Kategori", "Asal", "Tahun"]],
      body: data.map(i => [i.kode, i.nama, i.jumlah, i.kondisi, i.lokasi, i.kategori, i.asal, i.tahun])
    });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const simpanItem = () => {
    if (!form.nama || !form.jumlah) return;
    const data: Item = {
      id: editId ?? Date.now(),
      kode: form.kode,
      nama: form.nama,
      jumlah: Number(form.jumlah),
      kondisi: form.kondisi,
      lokasi: form.lokasi,
      kategori: form.kategori,
      asal: form.asal,
      tahun: form.tahun
    };

    if (editId !== null) {
      setItems(items.map(i => (i.id === editId ? data : i)));
      setItemsUI(itemsUI.map(i => (i.id === editId ? { ...data, foto: form.foto } : i)));
      setEditId(null);
    } else {
      setItems([...items, data]);
      setItemsUI([...itemsUI, { ...data, foto: form.foto }]);
    }

    setForm({
      kode: "",
      nama: "",
      jumlah: 0,
      kondisi: "Baik",
      lokasi: "",
      kategori: "",
      asal: "",
      tahun: "",
      foto: ""
    });
  };

  const editItem = (item: ItemUI) => {
    const { id, ...rest } = item;
    setForm(rest);
    setEditId(id);
  };

  const hapusItem = (id: number) => {
    if (user.role !== "admin") return;
    if (!confirm("Yakin hapus data ini?")) return;
    setItems(items.filter(i => i.id !== id));
    setItemsUI(itemsUI.filter(i => i.id !== id));
  };

  const dataFilter = itemsUI.filter(i =>
    i.nama.toLowerCase().includes(search.toLowerCase()) ||
    i.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const rekap = kondisiList.map(k => ({
    kondisi: k,
    jumlah: items.filter(i => i.kondisi === k).length,
    warna: k === "Baik" ? "#16a34a" : k === "Rusak Ringan" ? "#facc15" : "#dc2626"
  }));

  const grafikKategori = Object.values(items.reduce((a: any, i) => {
    if (!i.kategori) return a;
    a[i.kategori] = a[i.kategori]
      ? { kategori: i.kategori, jumlah: a[i.kategori].jumlah + i.jumlah }
      : { kategori: i.kategori, jumlah: i.jumlah };
    return a;
  }, {}));

  const grafikLokasi = Object.values(items.reduce((a: any, i) => {
    if (!i.lokasi) return a;
    a[i.lokasi] = a[i.lokasi]
      ? { lokasi: i.lokasi, jumlah: a[i.lokasi].jumlah + i.jumlah }
      : { lokasi: i.lokasi, jumlah: i.jumlah };
    return a;
  }, {}));

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-bold text-center">Login Sarpras</h1>
            <Input placeholder="Username" onChange={e => setLogin({ ...login, username: e.target.value })} />
            <Input type="password" placeholder="Password" onChange={e => setLogin({ ...login, password: e.target.value })} />
            <Button onClick={handleLogin}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-gradient-to-br from-[#FFF7E6] via-[#EAF2FF] to-[#F5FBFF] min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-700">Aplikasi Sarpras Sekolah</h1>
        <Button variant="destructive" onClick={logout}>Logout</Button>
      </div>

      {user.role !== "kepala" && (
        <Card className="bg-white/80 backdrop-blur shadow-md">
          <CardContent className="space-y-4 p-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Kode Barang" value={form.kode} onChange={e => setForm({ ...form, kode: e.target.value })} />
              <Input placeholder="Nama Barang" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
              <Input type="number" placeholder="Jumlah" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: Number(e.target.value) })} />
              <Input placeholder="Lokasi" value={form.lokasi} onChange={e => setForm({ ...form, lokasi: e.target.value })} />
              <Input placeholder="Kategori" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} />
              <Input placeholder="Asal Barang" value={form.asal} onChange={e => setForm({ ...form, asal: e.target.value })} />
              <Input type="number" placeholder="Tahun" value={form.tahun} onChange={e => setForm({ ...form, tahun: e.target.value })} />
              <select className="border p-2 rounded" value={form.kondisi} onChange={e => setForm({ ...form, kondisi: e.target.value })}>
                {kondisiList.map(k => <option key={k}>{k}</option>)}
              </select>
              <Input type="file" accept="image/*" onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setForm({ ...form, foto: String(r.result) });
                r.readAsDataURL(f);
              }} />
            </div>
            <Button onClick={simpanItem}>{editId ? "Update" : "Simpan"}</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-2">
        <Input placeholder="Cari barang..." value={search} onChange={e => setSearch(e.target.value)} />
        <Button onClick={() => exportExcel(dataFilter, "laporan_sarpras_filtered.xlsx")}>Excel</Button>
        <Button onClick={() => exportPDF(dataFilter, "laporan_sarpras_filtered.pdf")}>PDF</Button>
      </div>

      <Card className="bg-white/80 backdrop-blur shadow-md">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Asal</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>QR</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataFilter.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{i.kode}</TableCell>
                  <TableCell>{i.nama}</TableCell>
                  <TableCell>{i.jumlah}</TableCell>
                  <TableCell>{i.kondisi}</TableCell>
                  <TableCell>{i.lokasi}</TableCell>
                  <TableCell>{i.kategori}</TableCell>
                  <TableCell>{i.asal}</TableCell>
                  <TableCell>{i.tahun}</TableCell>
                  <TableCell>{i.foto && <img src={i.foto} className="w-12 h-12" />}</TableCell>
                  <TableCell><QRCodeCanvas value={JSON.stringify({ id: i.id, kode: i.kode, nama: i.nama })} size={64} /></TableCell>
                  <TableCell>
                    {user.role !== "kepala" && <Button size="sm" onClick={() => editItem(i)}>Edit</Button>}
                    {user.role === "admin" && <Button size="sm" variant="destructive" onClick={() => hapusItem(i.id)}>Hapus</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={rekap} dataKey="jumlah" nameKey="kondisi" label>
              {rekap.map((d, i) => (
                <Cell key={i} fill={d.warna} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={grafikKategori}>
            <XAxis dataKey="kategori" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="jumlah">
              {grafikKategori.map((_, i) => (
                <Cell key={i} fill={["#2563eb", "#1d4ed8", "#60a5fa", "#3b82f6"][i % 4]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={grafikLokasi}>
            <XAxis dataKey="lokasi" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="jumlah">
              {grafikLokasi.map((_, i) => (
                <Cell key={i} fill={["#0ea5e9", "#38bdf8", "#7dd3fc", "#0284c7"][i % 4]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
