import { toast } from "sonner";

const baseStyle = {
  backgroundColor: "white",
};

export const errorToast = (msg: string) =>
  toast.error(msg, {
    style: {
      ...baseStyle,
      border: "2px solid #ef4444", // красный
      color: "#ef4444",
    },
  });

export const successToast = (msg: string) =>
  toast.success(msg, {
    style: {
      ...baseStyle,
      border: "2px solid #22c55e", // зелёный
      color: "#22c55e",
    },
  });
