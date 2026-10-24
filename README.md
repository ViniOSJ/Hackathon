Grupo ALVILA


Alexandra Silvestre de Souza da Silva ,
Larissa Santana Silva, 
Vinicius Oliveira Santos de Jesus, 

Sistema de Validação de Recebíveis — ANTECIPE FIDC
Sobre o projeto
Este projeto é uma aplicação desenvolvida em Java com Spring Boot para importar, armazenar, consultar e validar recebíveis a partir de arquivos CSV.
O sistema verifica se cada recebível atende às regras de negócio configuradas para o fundo ANTECIPE FIDC. Ao final da validação, cada registro pode ser classificado como APROVADO ou BARRADO, com os motivos de reprovação quando houver. Para recebíveis aprovados, o sistema também calcula o valor de compra estimado com base em uma taxa de desconto simples.
Funcionalidades
Leitura de recebíveis a partir de um arquivo CSV.
Validação da estrutura do arquivo e das informações dos registros.
Importação dos recebíveis para um banco de dados SQLite.
Consulta dos recebíveis armazenados por meio de uma API REST.
Validação individual dos recebíveis conforme as regras configuradas.
Consulta de situação cadastral a partir de um arquivo CSV de referência.
Retorno dos motivos pelos quais um recebível foi barrado.
Cálculo do valor de compra para recebíveis aprovados.
Disponibilização dos resultados em JSON e JSON Lines (NDJSON).
Tecnologias utilizadas
Java
Spring Boot
SQLite
JDBC para acesso ao banco de dados
API REST
CSV para importação de dados
> A versão do Java e as versões das dependências devem ser conferidas no arquivo de configuração de build do projeto (por exemplo, `pom.xml` ou `build.gradle`).
Como o sistema funciona
A aplicação Spring Boot é iniciada.
O controlador lê o arquivo `recebiveis.csv`.
O leitor verifica as linhas e espera encontrar 11 colunas separadas por ponto e vírgula (`;`).
Os registros válidos para leitura são convertidos em objetos `Recebivel`.
Os recebíveis são armazenados na tabela `recebiveis`, no banco SQLite `hackathon.db`.
Quando o endpoint de validação é chamado, o sistema aplica as regras de negócio e consulta a situação cadastral no arquivo de referência.
A API retorna o status de cada recebível e os motivos de bloqueio. Para os aprovados, também retorna o valor de compra calculado.
Estrutura esperada dos arquivos CSV
`recebiveis.csv`
O arquivo deve estar acessível no diretório de execução da aplicação e usar `;` como separador. O leitor espera 11 colunas nesta ordem:
Índice	Coluna	Descrição
0	`nomeFundo`	Nome do fundo
1	`docFundo`	CNPJ/documento do fundo
2	`nomeCedente`	Nome do cedente
3	`docCedente`	Documento do cedente
4	`nomeSacado`	Nome do sacado
5	`docSacado`	Documento do sacado
6	`nuDocumento`	Número do documento do recebível
7	`tipoRecebivel`	Tipo do recebível
8	`valorNominal`	Valor nominal do recebível
9	`dataVencimentoOriginal`	Data de vencimento
10	`dataAquisicao`	Data de aquisição
As datas aceitas pela validação podem estar no formato `uuuu-MM-dd` ou `dd/MM/uuuu`. Para manter o arquivo consistente, recomenda-se utilizar `uuuu-MM-dd`.
Exemplo ilustrativo de estrutura:
```csv
nomeFundo;docFundo;nomeCedente;docCedente;nomeSacado;docSacado;nuDocumento;tipoRecebivel;valorNominal;dataVencimentoOriginal;dataAquisicao
ANTECIPE FIDC;92234400000180;Cedente Exemplo;11111111111111;Sacado Exemplo;22222222222222;DOC-001;Duplicata;1500.00;2026-12-15;2026-10-01
```
O exemplo é fictício e serve apenas para demonstrar a estrutura. Para que o registro seja aprovado, os documentos e a situação cadastral precisam corresponder aos dados de referência e às regras configuradas.
`cnpj_situacao_mock.csv`
O arquivo é utilizado para consultar a situação cadastral dos sacados. Deve estar no diretório de execução da aplicação e utilizar `;` como separador.
Estrutura esperada:
```csv
DOC;SITUACAO
22222222222222;ATIVA
```
Os dados acima são ilustrativos. A validação cadastral está configurada para aceitar a situação `ATIVA`. Se o arquivo não estiver disponível ou o documento não for encontrado, a validação poderá barrar o recebível.
Regras de negócio configuradas
As regras são definidas principalmente na classe `Configuracao` e aplicadas pela classe `Regras`.
Regra	Configuração atual
Fundo	Nome e CNPJ devem corresponder ao ANTECIPE FIDC configurado
Campos obrigatórios	Os dados essenciais do recebível devem estar preenchidos
Situação cadastral do sacado	Deve ser `ATIVA`, consultada no CSV de referência
Tipos aceitos	`Duplicata` e `Duplicata de Serviço`
Valor nominal mínimo	R$ 100,00
Recebível vencido	Não permitido
Prazo máximo	180 dias entre aquisição e vencimento
Prazo mínimo	Regra desativada
Concentração por sacado	Regra marcada como ativada na configuração, com limite de 10%
Concentração por cedente	Regra desativada; limite configurado de 8%
Importante: embora a configuração marque a validação de concentração por sacado como ativada, o fluxo atual da classe `Regras` não mostra a aplicação dessa verificação. Essa regra precisa ser confirmada/implementada antes de considerar a concentração efetivamente validada.
Cálculo do valor de compra
Para os recebíveis aprovados, o sistema calcula o valor de compra utilizando desconto simples.
Fórmulas:
```text
desconto = valor nominal × (taxa mensal / 100) × (dias até o vencimento / base de dias)

valor de compra = valor nominal − desconto
```
Parâmetros atuais:
Taxa mensal: 2%
Base de dias: 30
Arredondamento do resultado: duas casas decimais
O cálculo é realizado pela classe `Regras`, no método `calcularValorCompra`.
Banco de dados
O sistema utiliza o SQLite e cria o arquivo `hackathon.db` no diretório de execução.
A classe `RecebivelDAO` gerencia a tabela `recebiveis`, que armazena os dados importados. A importação em lote utiliza operações batch e transação para gravar os registros.
O projeto também contém a classe `BancoRapido`, que cria uma tabela separada chamada `registro` para salvar informações genéricas. Ela não é a tabela principal usada pela API de recebíveis.
Endpoints da API
A API utiliza o prefixo `/api/recebiveis`.
1. Listar recebíveis
```http
GET /api/recebiveis
```
Retorna a lista de recebíveis armazenados no banco de dados.
2. Validar recebíveis
```http
GET /api/recebiveis/validar
```
Retorna os resultados da validação em formato JSON. Cada item pode conter:
`linha`: número de referência da linha no CSV;
`id`: número do documento;
`status`: `APROVADO` ou `BARRADO`;
`barrado_por`: lista de motivos de bloqueio;
`situacaoCadastral`: situação encontrada para o sacado;
`valorCompra`: valor calculado, quando o recebível é aprovado.
Exemplo ilustrativo de resposta:
```json
[
  {
    "linha": 2,
    "id": "DOC-001",
    "status": "APROVADO",
    "barrado_por": [],
    "situacaoCadastral": "ATIVA",
    "valorCompra": 1475.00
  }
]
```
Os valores deste exemplo são demonstrativos.
3. Validar recebíveis em linhas (NDJSON)
```http
GET /api/recebiveis/validar/linhas
```
Retorna um objeto JSON por linha, no formato `application/x-ndjson`. Esse formato pode ser útil para processar resultados de forma incremental.
Como executar
Pré-requisitos
JDK compatível com a versão configurada no projeto;
Maven ou Gradle, conforme o build utilizado;
Arquivos `recebiveis.csv` e `cnpj_situacao_mock.csv` no diretório de execução.
Passos
Clone o repositório:
```bash
   git clone <URL_DO_REPOSITORIO>
   ```
Entre na pasta do projeto:
```bash
   cd <PASTA_DO_PROJETO>
   ```
Coloque os arquivos CSV no diretório de execução esperado pela aplicação.
Execute o projeto usando o sistema de build configurado.
Se o projeto utilizar Maven Wrapper:
```bash
   ./mvnw spring-boot:run
   ```
No Windows:
```bat
   mvnw.cmd spring-boot:run
   ```
Se não houver wrapper, mas o projeto utilizar Maven:
```bash
   mvn spring-boot:run
   ```
Com a aplicação em execução, acesse os endpoints, por exemplo:
```text
   http://localhost:8080/api/recebiveis
   http://localhost:8080/api/recebiveis/validar
   http://localhost:8080/api/recebiveis/validar/linhas
   ```
> Os comandos e a porta dependem da configuração real do projeto. Confira o arquivo de build e as configurações do Spring Boot caso sejam diferentes.
Organização do código
Classe	Responsabilidade
`DemoApplication`	Inicializa a aplicação Spring Boot e o banco genérico
`RecebivelController`	Disponibiliza os endpoints REST e coordena importação e validação
`LeitorCSV`	Lê o CSV e converte as linhas em objetos
`Recebivel`	Modelo de dados de um recebível
`RecebivelDAO`	Persiste e consulta recebíveis no SQLite
`Regras`	Aplica validações e calcula o valor de compra
`Configuracao`	Centraliza parâmetros e regras de negócio
`SituacaoCadastral`	Carrega e consulta o CSV de situação cadastral
`ResultadoValidacao`	Modelo auxiliar para representar o resultado de validação
`BancoRapido`	Cria a tabela genérica `registro` e salva dados simples
`Main`	Executa um fluxo alternativo de leitura do CSV e impressão no console
Limitações e pontos de atenção
Os caminhos dos arquivos CSV são relativos ao diretório de execução; confirme que os arquivos estão no local esperado.
A situação cadastral vem de um arquivo mock (`cnpj_situacao_mock.csv`), não de uma consulta oficial em tempo real.
A validação de concentração por sacado está ativada na configuração, mas sua implementação deve ser verificada.
O controlador importa os dados durante sua construção. É importante avaliar esse comportamento para evitar importações repetidas a cada inicialização ou recriação do controlador.
A classe `RecebivelDAO` possui o método `apagarTodos`, mas ele não é chamado pelo fluxo de importação mostrado. Reexecutar a importação pode inserir documentos duplicados.
O repositório também contém uma classe `Main` com um fluxo independente; o ponto de entrada Spring Boot é `DemoApplication`.
Antes de usar com dados reais, revise o tratamento de erros, a política de duplicidade, a segurança e a origem dos dados cadastrais.
Objetivo
O projeto busca automatizar a leitura e a análise de recebíveis, centralizando as regras de validação e disponibilizando os resultados por uma API REST, facilitando a integração com uma interface web ou outros sistemas.
---
Desenvolvido para fins de projeto/hackathon.
