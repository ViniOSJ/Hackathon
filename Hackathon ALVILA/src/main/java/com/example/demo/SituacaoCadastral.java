
package com.example.demo;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class SituacaoCadastral {

    private final Map<String, String> situacoes = new HashMap<>();
    private boolean arquivoCarregado = false;

    public SituacaoCadastral() {
        Path caminho = Path.of("cnpj_situacao_mock.csv");

        try (BufferedReader leitor = Files.newBufferedReader(
                caminho, StandardCharsets.UTF_8)) {

            String linha;

            while ((linha = leitor.readLine()) != null) {
                if (linha.isBlank()) {
                    continue;
                }

                String[] colunas = linha.split(";", -1);

                // Ignora o cabeçalho
                if (colunas[0].trim().equalsIgnoreCase("DOC")) {
                    continue;
                }

                if (colunas.length < 2) {
                    continue;
                }

                String cnpj = normalizarCnpj(colunas[0]);
                String situacao = colunas[1].trim().toUpperCase();

                if (!cnpj.isEmpty() && !situacao.isEmpty()) {
                    situacoes.put(cnpj, situacao);
                }
            }

            arquivoCarregado = true;

        } catch (IOException e) {
            System.err.println(
                    "Erro ao ler cnpj_situacao_mock.csv: "
                            + e.getMessage());
        }
    }

    public boolean isArquivoCarregado() {
        return arquivoCarregado;
    }


    public String consultar(String cnpj) {
        if (cnpj == null) {
            return null;
        }

        String documento = normalizarCnpj(cnpj);
        String situacao = situacoes.get(documento);

        System.out.println(
                "Consulta cadastral: documento="
                        + documento
                        + ", situação="
                        + situacao
        );

        return situacao;
    }


    private String normalizarCnpj(String cnpj) {
        return cnpj.replaceAll("\\D", "");
    }
}
