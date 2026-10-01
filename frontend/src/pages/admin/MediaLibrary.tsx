import React, { useState, useRef } from 'react';
import { Image as ImageIcon, UploadCloud, Copy, Trash2, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useMediaLibrary, useAddMedia, useDeleteMedia, MediaAsset } from '../../hooks/useMediaLibrary';
import { uploadProductImage } from '../../utils/uploadFile';
import { useNotification } from '../../components/NotificationContext';
import { Button, Input } from '../../components/ui';

export function MediaLibrary() {
  const notify = useNotification();
  const { data: media = [], isLoading, isError, refetch } = useMediaLibrary();
  const addMedia = useAddMedia();
  const deleteMedia = useDeleteMedia();

  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = media.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await uploadProductImage(file);
        await addMedia.mutateAsync({
          url,
          name: file.name,
          size: file.size,
          type: file.type || 'image/unknown'
        });
        notify({ type: 'success', title: 'Uploaded', message: `${file.name} uploaded successfully.` });
      } catch (err: any) {
        notify({ type: 'error', title: 'Upload Failed', message: err.message || `Failed to upload ${file.name}` });
      }
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    notify({ type: 'success', title: 'Copied', message: 'URL copied to clipboard.' });
  };

  const handleDelete = async (asset: MediaAsset) => {
    if (!window.confirm(`Are you sure you want to delete ${asset.name}?`)) return;
    try {
      await deleteMedia.mutateAsync(asset);
      notify({ type: 'success', title: 'Deleted', message: 'Asset deleted successfully.' });
    } catch (err: any) {
      notify({ type: 'error', title: 'Delete Failed', message: err.message || 'Failed to delete asset.' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="text-xs font-mono text-muted uppercase tracking-wider">Loading media...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center justify-between">
        <span>Failed to load media library from Firestore.</span>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent block">
            Storefront
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Media Library
          </h1>
          <p className="mt-1 text-xs text-muted font-sans">
            Manage your uploaded images and assets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
            accept="image/*" 
          />
          <Button onClick={handleUploadClick} isLoading={isUploading} className="w-full sm:w-auto flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Upload
          </Button>
        </div>
      </div>

      <div className="flex items-center bg-white border border-line rounded-xl px-4 py-2 shadow-sm max-w-md">
        <Search className="w-4 h-4 text-muted mr-3" />
        <input 
          type="text" 
          placeholder="Search files..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-sm text-ink placeholder-muted"
        />
      </div>

      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-shell rounded-2xl border border-dashed border-line">
          <ImageIcon className="w-12 h-12 text-muted mb-4" />
          <p className="text-sm font-semibold text-ink">No media found</p>
          <p className="text-xs text-muted mt-1">Upload some assets to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMedia.map(asset => (
            <div key={asset.id} className="group relative bg-white border border-line rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-shell flex items-center justify-center overflow-hidden">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-ink truncate" title={asset.name}>{asset.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted font-mono">{formatSize(asset.size)}</span>
                  <span className="text-[10px] text-muted font-mono">{new Date(asset.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <button 
                  onClick={() => handleCopy(asset.url, asset.id)}
                  className="p-2 bg-white text-ink rounded-lg hover:bg-zinc-100 transition-colors shadow-sm"
                  title="Copy URL"
                >
                  {copiedId === asset.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => handleDelete(asset)}
                  disabled={deleteMedia.isPending}
                  className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-sm disabled:opacity-50"
                  title="Delete"
                >
                  {deleteMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
