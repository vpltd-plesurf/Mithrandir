"use client";

import { useState, useEffect, useCallback } from "react";
import type { Book, TierGroup, UploadResponse, IngestProgress } from "@/lib/types";
import {
  fetchLibrary,
  uploadBook,
  confirmMatch,
  subscribeToProgress,
} from "@/lib/api";
import LibraryProgress from "@/components/LibraryProgress";
import TierSection from "@/components/TierSection";
import BookDropZone from "@/components/BookDropZone";
import BookMatchModal from "@/components/BookMatchModal";
import BookPreviewModal from "@/components/BookPreviewModal";

export default function LibraryPage() {
  const [tiers, setTiers] = useState<TierGroup[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [uploading, setUploading] = useState(false);
  const [matchModal, setMatchModal] = useState<UploadResponse | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<number, { stage: string; progress: number; detail: string }>
  >({});

  const loadLibrary = useCallback(async () => {
    try {
      const data = await fetchLibrary();
      setTiers(data.tiers);
      setAllBooks(data.books);
    } catch {
      // silently fail, retry on next poll
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    loadLibrary();
    const interval = setInterval(loadLibrary, 5000);
    return () => clearInterval(interval);
  }, [loadLibrary]);

  // SSE progress subscription
  useEffect(() => {
    const es = subscribeToProgress((data) => {
      const progress = data as IngestProgress;
      setProgressMap((prev) => ({
        ...prev,
        [progress.catalogue_id]: {
          stage: progress.stage,
          progress: progress.progress,
          detail: progress.detail,
        },
      }));

      // Refresh library when a book completes or errors
      if (progress.stage === "complete" || progress.stage === "error") {
        setTimeout(loadLibrary, 500);
      }
    });

    return () => es.close();
  }, [loadLibrary]);

  const handleFilesSelected = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const result = await uploadBook(file);
        if (result.matched) {
          // Auto-matched and ingestion started
          await loadLibrary();
        } else if (result.candidates.length > 0) {
          // Show match modal
          setMatchModal(result);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleMatchSelect = async (catalogueId: number) => {
    if (!matchModal) return;
    try {
      await confirmMatch(matchModal.filename, catalogueId);
      setMatchModal(null);
      await loadLibrary();
    } catch (err) {
      console.error("Match failed:", err);
    }
  };

  const ready = allBooks.filter((b) => b.status === "ready").length;
  const total = allBooks.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-heading text-2xl text-accent tracking-wide mb-6">
        Library
      </h1>

      <LibraryProgress ready={ready} total={total} />

      <BookDropZone
        onFilesSelected={handleFilesSelected}
        disabled={uploading}
      />

      <div className="mt-8">
        {tiers.map((tier) => (
          <TierSection
            key={tier.tier}
            tier={tier.tier}
            label={tier.tier_label}
            books={tier.books}
            progressMap={progressMap}
            onPreview={setPreviewId}
          />
        ))}
      </div>

      {matchModal && (
        <BookMatchModal
          filename={matchModal.filename}
          candidates={matchModal.candidates}
          onSelect={handleMatchSelect}
          onDismiss={() => setMatchModal(null)}
        />
      )}

      {previewId !== null && (
        <BookPreviewModal
          catalogueId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}
