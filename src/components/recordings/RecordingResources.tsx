import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, FileSpreadsheet, FileImage, File, Download, Trash2, Plus, Loader2, Paperclip } from 'lucide-react';
import { RecordingResource } from '@/hooks/useRecordingResources';

interface RecordingResourcesProps {
  resources: RecordingResource[];
  loading: boolean;
  canManage: boolean;
  onDelete: (resource: RecordingResource) => void;
  onUploadClick: () => void;
}

const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'doc':
    case 'docx':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <FileImage className="h-5 w-5 text-purple-500" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function RecordingResources({
  resources,
  loading,
  canManage,
  onDelete,
  onUploadClick,
}: RecordingResourcesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Resources
        </CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={onUploadClick}>
            <Plus className="h-4 w-4 mr-1" />
            Add Resource
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No resources attached to this recording.
          </p>
        ) : (
          <div className="space-y-2">
            {resources.map((resource, index) => (
              <div
                key={`${resource.file_url}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(resource.file_type)}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(resource.file_size)} • {resource.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={resource.file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{resource.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(resource)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
