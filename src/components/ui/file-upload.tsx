"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: { x: 0, y: 0 },
  animate: { x: 20, y: -20, opacity: 0.9 },
};

const secondaryVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const FileUpload = ({
  onChange,
  previewUrl,
}: {
  onChange?: (files: File[]) => void;
  previewUrl?: string | null;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    const next = newFiles.slice(0, 1);
    setFiles(next);
    if (next.length) onChange?.(next);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    onDrop: handleFileChange,
    onDropRejected: () => {
      onChange?.([]);
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="group/file relative block w-full cursor-pointer overflow-hidden rounded-lg p-6"
        style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern />
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="relative z-20 font-sans text-sm font-bold" style={{ color: "var(--foreground)" }}>
            Subir foto
          </p>
          <p className="relative z-20 mt-1 font-sans text-xs" style={{ color: "var(--muted-foreground)" }}>
            Arrastra la imagen o haz clic para elegirla. No es obligatoria.
          </p>
          <div className="relative mx-auto mt-6 w-full max-w-xl">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={file.name + file.lastModified}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative z-40 mx-auto mt-4 flex w-full flex-col items-start justify-start overflow-hidden rounded-md p-4",
                  )}
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex w-full items-center justify-between gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="max-w-xs truncate text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="w-fit shrink-0 rounded-lg px-2 py-1 text-xs"
                      style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>
                  <div className="mt-2 flex w-full items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                      {file.type || "imagen"}
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                      {new Date(file.lastModified).toLocaleDateString("es-CO")}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-40 mx-auto mt-4 flex h-28 w-full max-w-[7rem] items-center justify-center overflow-hidden rounded-md"
                style={{ background: "var(--card)", boxShadow: "0 10px 40px rgba(0,0,0,.35)" }}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Foto actual" className="h-full w-full object-cover" />
                ) : isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Suéltala
                    <IconUpload className="h-4 w-4" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-4 w-4" style={{ color: "var(--gold)" }} />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute inset-0 z-30 mx-auto mt-4 flex h-28 w-full max-w-[7rem] items-center justify-center rounded-md border border-dashed opacity-0"
                style={{ borderColor: "var(--gold)" }}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex shrink-0 scale-105 flex-wrap items-center justify-center gap-x-px gap-y-px" style={{ background: "#1a1a1a" }}>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className="flex h-10 w-10 shrink-0 rounded-[2px]"
              style={{
                background: index % 2 === 0 ? "#141414" : "#101010",
              }}
            />
          );
        }),
      )}
    </div>
  );
}
