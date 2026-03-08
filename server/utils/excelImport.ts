import XLSX from 'xlsx';
import { 
  insertClientes, 
  insertProdutos, 
  insertEquipe,
  insertVendas,
  clearAllData,
  createImportLog,
} from '../db';

export interface ImportResult {
  success: boolean;
  message: string;
  linhasImportadas: number;
  linhasErro: number;
  detalhes: {
    clientes?: number;
    produtos?: number;
    equipe?: number;
    vendas?: number;
    erros?: string[];
  };
}

const REQUIRED_SHEETS = ['PRODUTOS', 'CLIENTES', 'EQUIPE', 'DADOS'];
const IGNORED_SHEETS = ['CAPA'];

// Helper: Convert Excel date to ISO string (YYYY-MM-DD)
function excelDateToISO(excelDate: any): string | null {
  if (excelDate === null || excelDate === undefined || excelDate === '') return null;
  
  try {
    let date: Date | null = null;
    
    if (excelDate instanceof Date) {
      if (!isNaN(excelDate.getTime())) date = excelDate;
    } else if (typeof excelDate === 'number') {
      // Excel serial date
      const d = new Date((excelDate - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) date = d;
    } else if (typeof excelDate === 'string') {
      const trimmed = excelDate.trim();
      if (trimmed) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) date = d;
      }
    }
    
    if (date) {
      // Return YYYY-MM-DD format for date columns
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    // ignore
  }
  
  return null;
}

// Helper: Parse integer safely
function parseInt2(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(String(value), 10);
  return isNaN(num) ? null : num;
}

// Helper: Parse decimal as string (for Drizzle decimal columns)
function parseDecimal(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value));
  if (isNaN(num)) return null;
  return num.toFixed(4);
}

// Helper: Get string value, trimmed
function str(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

// Helper: Normalize ATIVO/BLOQUEADO field
function normStatus(value: any, defaultVal = 'ATIVO'): string {
  const s = str(value);
  if (!s) return defaultVal;
  return s.toUpperCase();
}

// ============= CLIENTES PARSER =============
// Excel columns: EMPRESA, COD. CLIENTE, RAZAO SOCIAL, FANTASIA, CPF OU CNPJ,
// TIPO CLIENTE, INSC. ESTADUAL, COD. VENDEDOR, VENDEDOR, COD. SUP, COD. GER,
// TIPO_VENDEDOR, FUNÇÃO, CANAL, COD. FREQ VISITA, FREQUENCIA VISITA, COD. VISITA,
// VISITA, COND. PAG, DT. ULT COMPRA, LIMITE CREDITO, CEP, ENDEREÇO, NUMERO,
// COMPLEMENTO, BAIRRO, CIDADE, UF, COD. REGIAO, REGIAO, TELEFONE 01, TELEFONE 02,
// EMAIL, LATITUDE, LONGITUDE, DATA CADASTRO, ATIVO, BLOQUEADO
function parseClientesSheet(sheet: XLSX.WorkSheet): any[] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const data: any[] = [];

  for (const row of rows as any[]) {
    try {
      const codCliente = parseInt2(row['COD. CLIENTE']);
      const razaoSocial = str(row['RAZAO SOCIAL']);
      if (!codCliente || !razaoSocial) continue;

      data.push({
        empresa:          str(row['EMPRESA']),
        codCliente,
        razaoSocial,
        fantasia:         str(row['FANTASIA']),
        cpfOuCnpj:        str(row['CPF OU CNPJ']),
        tipoPessoa:       str(row['TIPO CLIENTE']),
        inscricaoEstadual: str(row['INSC. ESTADUAL']),
        // Map fields that exist in schema
        limiteCredito:    parseDecimal(row['LIMITE CREDITO']),
        cep:              str(row['CEP']),
        endereco:         str(row['ENDEREÇO']),   // NOTE: accent in Excel
        numero:           str(row['NUMERO']),
        complemento:      str(row['COMPLEMENTO']),
        bairro:           str(row['BAIRRO']),
        cidade:           str(row['CIDADE']),
        estado:           str(row['UF']),          // NOTE: UF in Excel, not ESTADO
        latitude:         row['LATITUDE'] != null ? parseFloat(String(row['LATITUDE'])) || null : null,
        longitude:        row['LONGITUDE'] != null ? parseFloat(String(row['LONGITUDE'])) || null : null,
        telefone:         str(row['TELEFONE 01']),
        celular:          str(row['TELEFONE 02']),
        email:            str(row['EMAIL']),
        dataCadastro:     excelDateToISO(row['DATA CADASTRO']),
        ativo:            normStatus(row['ATIVO'], 'ATIVO'),
        bloqueado:        normStatus(row['BLOQUEADO'], 'NAO'),
      });
    } catch (err) {
      // skip row
    }
  }

  return data;
}

// ============= PRODUTOS PARSER =============
// Excel columns: EMPRESA, COD. PROD, PRODUTO, MARCA, CATEGORIA, GRUPO, SABOR,
// QTD. EMB, LOCALIZACAO, QTD. MULTIPLO, STATUS ESTOQUE, ESTOQUE TOTAL UND,
// CAIXA, UND, PESO BRUTO, NATUREZA DO PRODUTO, COD. BARRAS, NCM, CEST,
// INDICADOR ICMS, ALIQUOTA ICMS, INDICADOR PIS/COFINS, CESTA BASICA,
// ULTIMO FORNECEDOR, DATA ULT. COMPRA, ULT. NF COMPRA, QTD DIAS DA ULT. COMPRA,
// DATA ULT. VENDA, QTD DIAS DA ULT. VENDA, PREÇO CUSTO, PREÇO COMPRA,
// PREÇO NOTA, PREÇO VENDA, PREÇO PROMOCAO, PREÇO ESPECIAL (BALCAO),
// DESC %, STATUS PREÇO/ESTOQUE, SOFMOB, STATUS
function parseProdutosSheet(sheet: XLSX.WorkSheet): any[] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const data: any[] = [];

  for (const row of rows as any[]) {
    try {
      const codProduto = parseInt2(row['COD. PROD']);    // NOTE: COD. PROD not COD. PRODUTO
      const nome = str(row['PRODUTO']);                   // NOTE: PRODUTO not NOME
      if (!codProduto || !nome) continue;

      data.push({
        empresa:          str(row['EMPRESA']),
        codProduto,
        nome,
        marca:            str(row['MARCA']),
        categoria:        str(row['CATEGORIA']),
        grupo:            str(row['GRUPO']),
        sabor:            str(row['SABOR']),
        codigoBarras:     str(row['COD. BARRAS']),
        estoqueTotal:     parseInt2(row['ESTOQUE TOTAL UND']),
        precoCusto:       parseDecimal(row['PREÇO CUSTO']),
        precoVenda:       parseDecimal(row['PREÇO VENDA']),
        ativo:            normStatus(row['STATUS'], 'ATIVO'),
      });
    } catch (err) {
      // skip row
    }
  }

  return data;
}

// ============= EQUIPE PARSER =============
// Excel columns: EMPRESA, COD. VENDEDOR, VENDEDOR, COD. SUP, FUNCAO, COD. GER,
// TIPO, EMPRESA RESPONSAVEL
function parseEquipeSheet(sheet: XLSX.WorkSheet): any[] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const data: any[] = [];

  for (const row of rows as any[]) {
    try {
      const codVendedor = parseInt2(row['COD. VENDEDOR']);
      const nome = str(row['VENDEDOR']);                  // NOTE: VENDEDOR not NOME
      if (!codVendedor || !nome) continue;

      data.push({
        empresa:            str(row['EMPRESA']),
        codVendedor,
        nome,
        codSup:             parseInt2(row['COD. SUP']),
        funcao:             str(row['FUNCAO']),
        codGer:             parseInt2(row['COD. GER']),
        tipo:               str(row['TIPO']),
        empresaResponsavel: str(row['EMPRESA RESPONSAVEL']),
        ativo:              'ATIVO',
      });
    } catch (err) {
      // skip row
    }
  }

  return data;
}

// ============= DADOS (VENDAS) PARSER =============
// Excel columns: EMPRESA, STATUS, OCORRENCIA, EMISSAO DATA, EMISSAO ANO MES,
// ACERTO DATA, ACERTO ANO MES, ANO, Nº. VENDA, Nº LOTE, Nº NOTA, MOD_NF,
// COD. CLIENTE, RAZAO SOCIAL, FANTASIA, CPF OU CNPJ, CANAL, CIDADE,
// COD. VENDEDOR, COD. SUP, COD. GER, FUNÇÃO, CFOP, TIPO_COB, PRAZO,
// IDVendaItens, COD. PRODUTO, PRODUTO, QTD. EMB, MARCA, CATEGORIA, GRUPO,
// SABOR, MOTORISTA, AJUDANTE 1, AJUDANTE 2, PLACA, ITEM C/ DEV, DEV. MOTIVO,
// PESO, QTD. UND VDA, QTD. UND BONIF, QTD. UND TROCA, QTD. CX VDA,
// QTD. CX REM, QTD. CX DEV, QTD. UND DEVOL, VLR. REMET, VLR. DEV, VLR VDA,
// VLR. CX, VLR. UND TAB, VLR. UND VDA, DESC. PERC, DESC. VLR,
// VLR. DESC. ITEM, DESC. VENDEDOR PERC
function parseDadosSheet(sheet: XLSX.WorkSheet): any[] {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const data: any[] = [];

  for (const row of rows as any[]) {
    try {
      const numVenda = parseInt2(row['Nº. VENDA']);       // NOTE: Nº. VENDA with dot
      const codCliente = parseInt2(row['COD. CLIENTE']);
      const codProduto = parseInt2(row['COD. PRODUTO']);

      if (!numVenda || !codCliente || !codProduto) continue;

      data.push({
        empresa:          str(row['EMPRESA']),
        status:           str(row['STATUS']),
        ocorrencia:       str(row['OCORRENCIA']),
        emissaoData:      excelDateToISO(row['EMISSAO DATA']),
        emissaoAnoMes:    str(row['EMISSAO ANO MES']),
        acertoData:       excelDateToISO(row['ACERTO DATA']),
        acertoAnoMes:     str(row['ACERTO ANO MES']),
        ano:              parseInt2(row['ANO']),
        numVenda,
        numLote:          parseInt2(row['Nº LOTE']),
        numNota:          parseInt2(row['Nº NOTA']),
        modNf:            str(row['MOD_NF']),
        codCliente,
        razaoSocial:      str(row['RAZAO SOCIAL']),
        fantasia:         str(row['FANTASIA']),
        cpfOuCnpj:        str(row['CPF OU CNPJ']),
        canal:            str(row['CANAL']),
        cidade:           str(row['CIDADE']),
        codVendedor:      parseInt2(row['COD. VENDEDOR']),
        codSup:           parseInt2(row['COD. SUP']),
        codGer:           parseInt2(row['COD. GER']),
        funcao:           str(row['FUNÇÃO']),              // NOTE: FUNÇÃO with accent
        cfop:             str(row['CFOP']),
        tipoCob:          str(row['TIPO_COB']),
        prazo:            str(row['PRAZO']),
        idVendaItens:     parseInt2(row['IDVendaItens']),
        codProduto,
        produto:          str(row['PRODUTO']),
        qtdEmb:           parseInt2(row['QTD. EMB']),
        marca:            str(row['MARCA']),
        categoria:        str(row['CATEGORIA']),
        grupo:            str(row['GRUPO']),
        sabor:            str(row['SABOR']),
        motorista:        str(row['MOTORISTA']),
        ajudante1:        str(row['AJUDANTE 1']),
        ajudante2:        str(row['AJUDANTE 2']),
        placa:            str(row['PLACA']),
        itemCDev:         str(row['ITEM C/ DEV']),         // NOTE: ITEM C/ DEV with slash
        devMotivo:        str(row['DEV. MOTIVO']),
        peso:             parseDecimal(row['PESO']),
        qtdUndVda:        parseDecimal(row['QTD. UND VDA']),
        qtdUndBonif:      parseDecimal(row['QTD. UND BONIF']),
        qtdUndTroca:      parseDecimal(row['QTD. UND TROCA']),
        qtdCxVda:         parseDecimal(row['QTD. CX VDA']),
        qtdCxRem:         parseDecimal(row['QTD. CX REM']),
        qtdCxDev:         parseDecimal(row['QTD. CX DEV']),
        qtdUndDevol:      parseDecimal(row['QTD. UND DEVOL']),
        vlrRemet:         parseDecimal(row['VLR. REMET']),
        vlrDev:           parseDecimal(row['VLR. DEV']),
        vlrVda:           parseDecimal(row['VLR VDA']),    // NOTE: VLR VDA without dot
        vlrCx:            parseDecimal(row['VLR. CX']),
        vlrUndTab:        parseDecimal(row['VLR. UND TAB']),
        vlrUndVda:        parseDecimal(row['VLR. UND VDA']),
        descPerc:         parseDecimal(row['DESC. PERC']),
        descVlr:          parseDecimal(row['DESC. VLR']),
        vlrDescItem:      parseDecimal(row['VLR. DESC. ITEM']),
        descVendedorPerc: parseDecimal(row['DESC. VENDEDOR PERC']),
      });
    } catch (err) {
      // skip row
    }
  }

  return data;
}

// ============= BATCH INSERT HELPER =============
async function insertInBatches<T>(
  data: T[],
  batchSize: number,
  insertFn: (batch: T[]) => Promise<any>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      await insertFn(batch);
      success += batch.length;
    } catch (err) {
      console.error(`[batch ${i}-${i + batchSize}] Error:`, String(err).slice(0, 200));
      // Try one by one if batch fails
      for (const row of batch) {
        try {
          await insertFn([row]);
          success++;
        } catch (rowErr) {
          failed++;
        }
      }
    }
  }

  return { success, failed };
}

// ============= MAIN IMPORT FUNCTION =============
export async function importExcelFile(fileBuffer: Buffer): Promise<ImportResult> {
  const errors: string[] = [];

  try {
    // Parse workbook - use cellDates:true to get Date objects for date cells
    const workbook = XLSX.read(fileBuffer, { cellDates: true, type: 'buffer' });
    const sheetNames = workbook.SheetNames.filter(name => !IGNORED_SHEETS.includes(name));

    // Validate required sheets
    const missingSheets = REQUIRED_SHEETS.filter(sheet => !sheetNames.includes(sheet));
    if (missingSheets.length > 0) {
      return {
        success: false,
        message: `Faltam abas obrigatórias: ${missingSheets.join(', ')}`,
        linhasImportadas: 0,
        linhasErro: 0,
        detalhes: { erros: [`Faltam abas: ${missingSheets.join(', ')}`] },
      };
    }

    // Clear existing data before import
    await clearAllData();

    const stats = { clientes: 0, produtos: 0, equipe: 0, vendas: 0 };
    let totalImported = 0;

    // ---- CLIENTES ----
    try {
      console.log('[import] Parsing CLIENTES...');
      const clientesData = parseClientesSheet(workbook.Sheets['CLIENTES']);
      console.log(`[import] CLIENTES parsed: ${clientesData.length} rows`);
      if (clientesData.length > 0) {
        const r = await insertInBatches(clientesData, 200, (batch) => insertClientes(batch));
        stats.clientes = r.success;
        totalImported += r.success;
        if (r.failed > 0) errors.push(`CLIENTES: ${r.failed} linhas com erro`);
        console.log(`[import] CLIENTES inserted: ${r.success}, failed: ${r.failed}`);
      }
    } catch (err) {
      const msg = `CLIENTES: ${String(err).slice(0, 200)}`;
      errors.push(msg);
      console.error('[import] CLIENTES error:', err);
    }

    // ---- PRODUTOS ----
    try {
      console.log('[import] Parsing PRODUTOS...');
      const produtosData = parseProdutosSheet(workbook.Sheets['PRODUTOS']);
      console.log(`[import] PRODUTOS parsed: ${produtosData.length} rows`);
      if (produtosData.length > 0) {
        const r = await insertInBatches(produtosData, 200, (batch) => insertProdutos(batch));
        stats.produtos = r.success;
        totalImported += r.success;
        if (r.failed > 0) errors.push(`PRODUTOS: ${r.failed} linhas com erro`);
        console.log(`[import] PRODUTOS inserted: ${r.success}, failed: ${r.failed}`);
      }
    } catch (err) {
      const msg = `PRODUTOS: ${String(err).slice(0, 200)}`;
      errors.push(msg);
      console.error('[import] PRODUTOS error:', err);
    }

    // ---- EQUIPE ----
    try {
      console.log('[import] Parsing EQUIPE...');
      const equipeData = parseEquipeSheet(workbook.Sheets['EQUIPE']);
      console.log(`[import] EQUIPE parsed: ${equipeData.length} rows`);
      if (equipeData.length > 0) {
        const r = await insertInBatches(equipeData, 100, (batch) => insertEquipe(batch));
        stats.equipe = r.success;
        totalImported += r.success;
        if (r.failed > 0) errors.push(`EQUIPE: ${r.failed} linhas com erro`);
        console.log(`[import] EQUIPE inserted: ${r.success}, failed: ${r.failed}`);
      }
    } catch (err) {
      const msg = `EQUIPE: ${String(err).slice(0, 200)}`;
      errors.push(msg);
      console.error('[import] EQUIPE error:', err);
    }

    // ---- DADOS (VENDAS) ----
    try {
      console.log('[import] Parsing DADOS...');
      const vendasData = parseDadosSheet(workbook.Sheets['DADOS']);
      console.log(`[import] DADOS parsed: ${vendasData.length} rows`);
      if (vendasData.length > 0) {
        const r = await insertInBatches(vendasData, 500, (batch) => insertVendas(batch));
        stats.vendas = r.success;
        totalImported += r.success;
        if (r.failed > 0) errors.push(`DADOS: ${r.failed} linhas com erro`);
        console.log(`[import] DADOS inserted: ${r.success}, failed: ${r.failed}`);
      }
    } catch (err) {
      const msg = `DADOS: ${String(err).slice(0, 200)}`;
      errors.push(msg);
      console.error('[import] DADOS error:', err);
    }

    // ---- LOG ----
    const status = errors.length === 0 ? 'sucesso' : totalImported > 0 ? 'parcial' : 'erro';
    const message = `Importação ${status}: ${totalImported} linhas importadas. Clientes: ${stats.clientes}, Produtos: ${stats.produtos}, Equipe: ${stats.equipe}, Vendas: ${stats.vendas}`;

    await createImportLog({
      nomeArquivo: 'BASERELATORIOS3.0.xlsm',
      status,
      mensagem: message,
      linhasImportadas: totalImported,
      linhasErro: errors.length,
      detalhes: JSON.stringify({ ...stats, erros: errors }),
    });

    return {
      success: totalImported > 0,
      message,
      linhasImportadas: totalImported,
      linhasErro: errors.length,
      detalhes: { ...stats, erros: errors },
    };

  } catch (error: any) {
    const cause = error?.cause?.message || error?.cause || '';
    const errorMsg = cause ? `${String(error)} | Causa: ${cause}` : String(error);
    console.error('[importExcelFile] Fatal error:', error);
    if (error?.cause) console.error('[importExcelFile] Cause:', error.cause);

    try {
      await createImportLog({
        nomeArquivo: 'BASERELATORIOS3.0.xlsm',
        status: 'erro',
        mensagem: `Erro fatal na importação: ${errorMsg}`,
        linhasImportadas: 0,
        linhasErro: 1,
        detalhes: JSON.stringify({ erro: errorMsg }),
      });
    } catch (logErr) {
      console.error('[importExcelFile] Failed to create log:', logErr);
    }

    return {
      success: false,
      message: `Erro fatal na importação: ${errorMsg}`,
      linhasImportadas: 0,
      linhasErro: 1,
      detalhes: { erros: [errorMsg] },
    };
  }
}
