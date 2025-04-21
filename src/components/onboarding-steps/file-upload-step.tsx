"use client"

import { useState, useCallback, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, ImageIcon } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { OnboardingFormValues } from "../ui/onboarding-flow"

type FileWithPreview = File & {
  preview: string
  type: string
}

export default function FileUploadStep() {
  const form = useFormContext<OnboardingFormValues>()
  const [files, setFiles] = useState<FileWithPreview[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      ) as FileWithPreview[]

      setFiles((prev) => [...prev, ...newFiles])

      // Update form value
      const currentFiles = form.getValues("files") || []
      form.setValue("files", [...currentFiles, ...acceptedFiles], { shouldValidate: true })
    },
    [form],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
    },
    maxSize: 5242880, // 5MB
  })

  const removeFile = (index: number) => {
    // Get the file to be removed
    const fileToRemove = files[index];
    
    // Update the files state
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });

    // Update form value
    const currentFiles = form.getValues("files") || [];
    const newFiles = [...currentFiles];
    newFiles.splice(index, 1);
    form.setValue("files", newFiles, { shouldValidate: true });
  }

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">資料アップロード</h2>
        <p className="text-muted-foreground">PDFまたはPNG形式の資料をアップロードしてください</p>
      </div>

      <FormField
        control={form.control}
        name="files"
        render={() => (
          <FormItem>
            <FormLabel>資料</FormLabel>
            <FormControl>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {isDragActive ? (
                    <p>ファイルをドロップしてください</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ、または</p>
                      <Button type="button" variant="secondary" size="sm">
                        ファイルを選択
                      </Button>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">PDFまたはPNG形式（最大5MB）</p>
                </div>
              </div>
            </FormControl>
            <FormDescription>会社案内や製品資料などをアップロードしてください</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">アップロードされたファイル</h3>
          <div className="grid grid-cols-4 gap-3">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <div className="border rounded-lg overflow-hidden">
                  {file.type.includes("image") ? (
                    <div className="aspect-square relative">
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Image failed to load", e);
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center">
                                <ImageIcon class="h-8 w-8 text-muted-foreground" />
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex flex-col items-center justify-center bg-muted p-4">
                      <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                        {file.type.split('/')[1] || 'ファイル'}
                      </span>
                    </div>
                  )}
                  <div className="p-2 text-xs truncate">{file.name}</div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
