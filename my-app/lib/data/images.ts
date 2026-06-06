import { isDemoMode } from "@/lib/demo/config";
import { uploadImage as realUpload, deleteImage as realDelete } from "@/lib/upload-image";

export async function uploadImage(file: File, folder: "categories" | "inventory"): Promise<string> {
  if (isDemoMode()) {
    try {
      return URL.createObjectURL(file);
    } catch {
      return "/placeholder-item.svg";
    }
  }
  return realUpload(file, folder);
}

export async function deleteImage(publicUrl: string): Promise<void> {
  if (isDemoMode()) return; // nothing to delete for object URLs
  return realDelete(publicUrl);
}
