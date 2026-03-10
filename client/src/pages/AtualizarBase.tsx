import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, AlertCircle, FileUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

interface ImportResult {
  success: boolean;
  message: string;
  linhasImportadas: number;
  linhasErro: number;
  detalhes: any;
}

export default function AtualizarBase() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.import.uploadExcel.useMutation();
  const { data: lastImport } = trpc.import.getLastImport.useQuery();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".xlsm")) {
        toast.error("Apenas arquivos .xlsm são aceitos");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-primary/5");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-primary/5");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/5");
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith(".xlsm")) {
        toast.error("Apenas arquivos .xlsm são aceitos");
        return;
      }
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async e => {
        const buffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(buffer);
        const chars = Array.from(uint8Array).map(b => String.fromCharCode(b));
        const base64 = btoa(chars.join(""));

        try {
          const response = await uploadMutation.mutateAsync({
            fileBuffer: base64,
            fileName: file.name,
          });

          setResult(response);

          if (response.success) {
            toast.success(response.message);
            setFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          } else {
            toast.error(response.message);
          }
        } catch (err) {
          toast.error("Erro ao processar arquivo");
          console.error(err);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error("Erro ao importar arquivo");
      console.error(error);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}

      <PageHeader
        title="Atualizar Base de Dados"
        description="Mantenha seus dados atualizados"
        accent="emerald"
      />

      {/* Upload Area */}
      <Card className="p-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center transition-colors cursor-pointer hover:border-primary hover:bg-primary/5"
        >
          <FileUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            Arraste um arquivo .xlsm aqui
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            ou clique para selecionar
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsm"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar arquivo
          </Button>

          {file && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                ✓ Arquivo selecionado: {file.name}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Tamanho: {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-6 flex gap-4">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="flex-1"
            >
              {importing ? "Importando..." : "Importar Dados"}
            </Button>
            <Button
              onClick={() => {
                setFile(null);
                setResult(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        )}
      </Card>

      {/* Import Result */}
      {result && (
        <Card
          className={`p-6 border-2 ${result.success ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20" : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"}`}
        >
          <div className="flex items-start gap-4">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3
                className={`font-semibold ${result.success ? "text-green-900 dark:text-green-200" : "text-red-900 dark:text-red-200"}`}
              >
                {result.success ? "Importação Concluída" : "Erro na Importação"}
              </h3>
              <p
                className={`text-sm mt-1 ${result.success ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`}
              >
                {result.message}
              </p>

              {result.linhasImportadas > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Linhas Importadas
                    </p>
                    <p className="text-2xl font-bold">
                      {result.linhasImportadas}
                    </p>
                  </div>
                  {result.detalhes.clientes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Clientes
                      </p>
                      <p className="text-2xl font-bold">
                        {result.detalhes.clientes}
                      </p>
                    </div>
                  )}
                  {result.detalhes.produtos && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Produtos
                      </p>
                      <p className="text-2xl font-bold">
                        {result.detalhes.produtos}
                      </p>
                    </div>
                  )}
                  {result.detalhes.equipe && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Equipe
                      </p>
                      <p className="text-2xl font-bold">
                        {result.detalhes.equipe}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {result.detalhes.erros && result.detalhes.erros.length > 0 && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700">
                  <p className="text-xs font-medium text-red-900 dark:text-red-200 mb-2">
                    Erros encontrados:
                  </p>
                  <ul className="text-xs text-red-800 dark:text-red-300 space-y-1">
                    {result.detalhes.erros.map((erro: string, idx: number) => (
                      <li key={idx}>• {erro}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Last Import Info */}
      {lastImport && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Última Importação</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-medium">
                {new Date(lastImport.dataImportacao).toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p
                className={`font-medium ${lastImport.status === "sucesso" ? "text-green-600" : "text-orange-600"}`}
              >
                {lastImport.status === "sucesso"
                  ? "✓ Sucesso"
                  : lastImport.status === "erro"
                    ? "✗ Erro"
                    : "⚠ Parcial"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Linhas Importadas</p>
              <p className="font-medium">{lastImport.linhasImportadas}</p>
            </div>
          </div>
          {lastImport.mensagem && (
            <p className="text-sm text-muted-foreground mt-4">
              {lastImport.mensagem}
            </p>
          )}
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-4">Instruções de Importação</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">1. Formato do arquivo:</strong>{" "}
            O arquivo deve estar em formato .xlsm (Excel com macros)
          </p>
          <p>
            <strong className="text-foreground">2. Abas obrigatórias:</strong>{" "}
            PRODUTOS, CLIENTES, EQUIPE, DADOS
          </p>
          <p>
            <strong className="text-foreground">3. Aba CAPA:</strong> Será
            ignorada durante a importação
          </p>
          <p>
            <strong className="text-foreground">
              4. Substituição de dados:
            </strong>{" "}
            Os dados existentes serão completamente substituídos pelos novos
          </p>
          <p>
            <strong className="text-foreground">5. Validação:</strong> O sistema
            valida o arquivo antes de importar
          </p>
        </div>
      </Card>
    </div>
  );
}
