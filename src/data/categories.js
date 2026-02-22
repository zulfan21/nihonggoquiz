import {
  Hash,
  BookOpen,
  ShoppingCart,
  Clock,
  MessageCircle,
  Calendar,
} from "lucide-react";

export const categories = [
  {
    id: "numbers",
    name: "Angka",
    icon: Hash,
    color: "bg-blue-500",
    inputType: "hiragana",
  },
  {
    id: "vocabulary",
    name: "Kosakata",
    icon: BookOpen,
    color: "bg-green-500",
    inputType: "indonesia",
  },
  {
    id: "shopping",
    name: "Harga Barang",
    icon: ShoppingCart,
    color: "bg-orange-500",
    inputType: "hiragana",
  },
  {
    id: "time",
    name: "Jam & Waktu",
    icon: Clock,
    color: "bg-purple-500",
    inputType: "hiragana",
  },
  {
    id: "dictionary",
    name: "Kamus",
    icon: MessageCircle,
    color: "bg-pink-500",
  },
  {
    id: "date",
    name: "Tanggal",
    icon: Calendar,
    color: "bg-rose-500",
    inputType: "hiragana",
  },
];
