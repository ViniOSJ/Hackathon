    package com.example.demo;

    import java.time.LocalDate;
    import java.time.format.DateTimeFormatter;
    import java.time.format.DateTimeParseException;
    import java.math.BigDecimal;
    import java.math.RoundingMode;
    import java.time.LocalDate;
    import java.time.format.DateTimeFormatter;
    import java.time.format.DateTimeParseException;
    import java.time.temporal.ChronoUnit;
    import java.util.ArrayList;
    import java.util.List;

    public class Regras {

        private final SituacaoCadastral situacaoCadastral;
        private final Configuracao configuracao;


        public Regras(Configuracao configuracao) {
            this.configuracao = configuracao;
            this.situacaoCadastral = new SituacaoCadastral();
        }


        public List<String> validar(Recebivel recebivel) {

            List<String> erros = new ArrayList<>();

            if (recebivel == null) {
                erros.add("Recebível inexistente.");
                return erros;
            }


            validarCamposObrigatorios(recebivel, erros);
            validarSituacaoCadastral(recebivel, erros);
            validarFundo(recebivel, erros);
            validarTipoRecebivel(recebivel, erros);
            validarValorMinimo(recebivel, erros);
            validarDatasEPrazos(recebivel, erros);


            return erros;
        }

        private void validarCamposObrigatorios(
                Recebivel recebivel,
                List<String> erros) {

            if (vazio(recebivel.getNomeFundo())) {
                erros.add("Nome do fundo não informado.");
            }

            if (vazio(recebivel.getDocFundo())) {
                erros.add("CNPJ do fundo não informado.");
            }

            if (vazio(recebivel.getNomeCedente())) {
                erros.add("Nome do cedente não informado.");
            }

            if (vazio(recebivel.getDocCedente())) {
                erros.add("Documento do cedente não informado.");
            }

            if (vazio(recebivel.getNomeSacado())) {
                erros.add("Nome do sacado não informado.");
            }

            if (vazio(recebivel.getDocSacado())) {
                erros.add("Documento do sacado não informado.");
            }

            if (vazio(recebivel.getNuDocumento())) {
                erros.add("Número do documento não informado.");
            }

            if (vazio(recebivel.getTipoRecebivel())) {
                erros.add("Tipo do recebível não informado.");
            }

            if (recebivel.getValorNominal() <= 0
                    || !Double.isFinite(recebivel.getValorNominal())) {
                erros.add("Valor nominal deve ser positivo e válido.");
            }

            if (vazio(recebivel.getDataVencimentoOriginal())) {
                erros.add("Data de vencimento não informada.");
            }

            if (vazio(recebivel.getDataAquisicao())) {
                erros.add("Data de aquisição não informada.");
            }
        }

        private void validarFundo(
                Recebivel recebivel,
                List<String> erros) {

            if (vazio(recebivel.getNomeFundo())
                    || vazio(recebivel.getDocFundo())) {
                return;
            }

            if (!Configuracao.NOME_FUNDO.equalsIgnoreCase(
                    recebivel.getNomeFundo().trim())) {
                erros.add("Nome do fundo diferente do configurado.");
            }

            String cnpjInformado = normalizarDocumento(
                    recebivel.getDocFundo());

            String cnpjConfigurado = normalizarDocumento(
                    Configuracao.CNPJ_FUNDO);

            if (!cnpjConfigurado.equals(cnpjInformado)) {
                erros.add("CNPJ do fundo diferente do configurado.");
            }
        }

        private void validarTipoRecebivel(
                Recebivel recebivel,
                List<String> erros) {

            if (!Configuracao.VALIDAR_TIPO_RECEBIVEL
                    || vazio(recebivel.getTipoRecebivel())) {
                return;
            }

            boolean tipoAceito = Configuracao.TIPOS_RECEBIVEIS_ACEITOS
                    .stream()
                    .anyMatch(tipo -> tipo.equalsIgnoreCase(
                            recebivel.getTipoRecebivel().trim()));

            if (!tipoAceito) {
                erros.add("Tipo de recebível não permitido.");
            }
        }

        private void validarValorMinimo(
                Recebivel recebivel,
                List<String> erros) {

            if (!Configuracao.VALIDAR_VALOR_MINIMO) {
                return;
            }

            if (!configuracao.valorMinimoConfigurado()) {
                erros.add("Valor mínimo não configurado.");
                return;
            }

            if (!Double.isFinite(recebivel.getValorNominal())
                    || recebivel.getValorNominal() <= 0) {
                return;
            }

            BigDecimal valor = BigDecimal.valueOf(
                    recebivel.getValorNominal());

            if (valor.compareTo(Configuracao.VALOR_MINIMO) < 0) {
                erros.add("Valor inferior ao mínimo permitido.");
            }
        }


        private LocalDate converterData(String data) {
            if (data == null || data.isBlank()) {
                throw new DateTimeParseException(
                        "Data vazia", data == null ? "" : data, 0);
            }

            DateTimeFormatter formatoISO =
                    DateTimeFormatter.ofPattern("uuuu-MM-dd");

            DateTimeFormatter formatoBR =
                    DateTimeFormatter.ofPattern("dd/MM/uuuu");

            try {
                return LocalDate.parse(data.trim(), formatoISO);
            } catch (DateTimeParseException e) {
                return LocalDate.parse(data.trim(), formatoBR);
            }
        }


        private void validarDatasEPrazos(
                Recebivel recebivel,
                List<String> erros) {

            LocalDate vencimento;
            LocalDate aquisicao;

            try {

                vencimento = converterData(
                        recebivel.getDataVencimentoOriginal());

                aquisicao = converterData(
                        recebivel.getDataAquisicao());


            } catch (DateTimeParseException | NullPointerException e) {
                erros.add(
                        "Data inválida. Utilize o formato "
                                + Configuracao.FORMATO_DATA + ".");
                return;
            }

            if (Configuracao.VALIDAR_NAO_VENCIDA
                    && vencimento.isBefore(LocalDate.now())) {
                erros.add("Recebível vencido.");
            }

            if (vencimento.isBefore(aquisicao)) {
                erros.add("Vencimento anterior à data de aquisição.");
                return;
            }

            if (Configuracao.VALIDAR_PRAZO_MAXIMO) {

                long dias = ChronoUnit.DAYS.between(
                        aquisicao,
                        vencimento);

                if (dias > Configuracao.PRAZO_MAXIMO_DIAS) {
                    erros.add("Prazo máximo de 180 dias excedido.");
                }
            }

            if (Configuracao.VALIDAR_PRAZO_MINIMO) {

                long dias = ChronoUnit.DAYS.between(
                        aquisicao,
                        vencimento);

                if (dias < Configuracao.PRAZO_MINIMO_DIAS) {
                    erros.add("Prazo inferior ao mínimo permitido.");
                }
            }
        }

        /*
         * Calcula o valor de compra usando desconto simples:
         *
         * desconto = valor nominal * (taxa mensal / 100)
         *            * (dias até o vencimento / base de dias)
         *
         * valor de compra = valor nominal - desconto
         */

        private void validarSituacaoCadastral(
                Recebivel recebivel,
                List<String> erros) {

            if (!Configuracao.VALIDAR_SITUACAO_CADASTRAL) {
                return;
            }

            String cnpj = recebivel.getDocSacado();

            if (cnpj == null || cnpj.isBlank()) {
                // O campo obrigatório já trata esse caso.
                return;
            }

            if (!situacaoCadastral.isArquivoCarregado()) {
                erros.add(
                        "Não foi possível validar a situação cadastral: "
                                + "arquivo cnpj_situacao_mock.csv indisponível.");
                return;
            }

            String situacao = situacaoCadastral.consultar(cnpj);

            if (situacao == null) {
                erros.add(
                        "CNPJ do sacado não encontrado no arquivo "
                                + "de situação cadastral.");
                return;
            }

            boolean situacaoAceita =
                    Configuracao.SITUACOES_CADASTRAIS_ACEITAS
                            .contains(situacao);

            if (!situacaoAceita) {
                erros.add(
                        "Situação cadastral do sacado não permitida: "
                                + situacao + ".");
            }
        }


        public BigDecimal calcularValorCompra(Recebivel recebivel) {

            if (recebivel == null
                    || !Double.isFinite(recebivel.getValorNominal())
                    || recebivel.getValorNominal() <= 0) {
                throw new IllegalArgumentException(
                        "Valor nominal inválido.");
            }

            LocalDate vencimento;
            LocalDate aquisicao;

            try {

                vencimento = converterData(
                        recebivel.getDataVencimentoOriginal());

                aquisicao = converterData(
                        recebivel.getDataAquisicao());


            } catch (DateTimeParseException | NullPointerException e) {
                throw new IllegalArgumentException(
                        "Não foi possível calcular: data inválida.");
            }

            long dias = ChronoUnit.DAYS.between(
                    aquisicao,
                    vencimento);

            if (dias < 0) {
                throw new IllegalArgumentException(
                        "A data de vencimento não pode ser anterior "
                                + "à data de aquisição.");
            }

            BigDecimal valorNominal = BigDecimal.valueOf(
                    recebivel.getValorNominal());

            BigDecimal taxa = Configuracao.TAXA_MENSAL_PERCENTUAL
                    .divide(new BigDecimal("100"), 10,
                            RoundingMode.HALF_UP);

            BigDecimal fracaoPrazo = BigDecimal.valueOf(dias)
                    .divide(BigDecimal.valueOf(
                                    Configuracao.BASE_DIAS),
                            10,
                            RoundingMode.HALF_UP);

            BigDecimal desconto = valorNominal
                    .multiply(taxa)
                    .multiply(fracaoPrazo);

            return valorNominal.subtract(desconto)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        private boolean vazio(String valor) {
            return valor == null || valor.isBlank();
        }

        private String normalizarDocumento(String documento) {
            return documento.replaceAll("\\D", "");
        }
        public String consultarSituacaoCadastral(String cnpj) {
            if (cnpj == null || cnpj.isBlank()) {
                return "NÃO INFORMADO";
            }

            if (!situacaoCadastral.isArquivoCarregado()) {
                return "ARQUIVO INDISPONÍVEL";
            }

            String situacao = situacaoCadastral.consultar(cnpj);

            return situacao != null ? situacao : "NÃO ENCONTRADA";
        }

    }
