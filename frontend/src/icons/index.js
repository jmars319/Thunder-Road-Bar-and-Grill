/*
  icons/index.js

  Purpose:
  - Centralized icon re-export layer. Re-exports named icons from the
    underlying icon package so components import from a single stable module.

  Contract:
  - Export named icon components and an `icons` map for runtime resolution.

  Notes:
  - Keep this module intentionally thin so the underlying icon package can
    be swapped in one place if needed.
*/
// Centralized icon exports — re-export icons from lucide-react here so
// components import from a single module. This reduces per-file lint noise
// and centralizes any future icon substitutions.
import {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  Inbox,
  Mail,
  MailOpen,
  Folder,
  Trash2,
  UtensilsCrossed,
  Plus,
  Edit,
  XCircle,
  Clock,
  Image,
  Upload,
  Copy,
  MapPin,
  Navigation,
  Settings,
  Save,
  Download,
  Sun,
  Moon,
  Monitor,
  Key,
  Bold,
  Italic,
  List,
  ListOrdered,
  Eraser,
  Wand2
} from 'lucide-react';

// Re-export named symbols for backwards compatibility with existing imports
export {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  Inbox,
  Mail,
  MailOpen,
  Folder,
  Trash2,
  UtensilsCrossed,
  Plus,
  Edit,
  XCircle,
  Clock,
  Image,
  Upload,
  Copy,
  MapPin,
  Navigation,
  Settings,
  Save,
  Download,
  Sun,
  Moon,
  Monitor,
  Key,
  Bold,
  Italic,
  List,
  ListOrdered,
  Eraser,
  Wand2
};

// Note: keep this module intentionally thin — it's a single re-export layer
// so we can swap the underlying icon package in one place later if needed.

// Also export a convenience map for consumers that need to resolve icons by name
// at runtime or in registries. This lets other modules do `import { icons } from './icons'`
// and reference `icons.Home` which ESLint will detect as a used symbol.
export const icons = {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  Inbox,
  Mail,
  MailOpen,
  Folder,
  Trash2,
  UtensilsCrossed,
  Plus,
  Edit,
  XCircle,
  Clock,
  Image,
  Upload,
  Copy,
  MapPin,
  Navigation,
  Settings,
  Save,
  Download,
  Sun,
  Moon,
  Monitor,
  Key,
  Bold,
  Italic,
  List,
  ListOrdered,
  Eraser,
  Wand2
};

export default icons;
