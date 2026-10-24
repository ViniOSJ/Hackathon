
package com.example.demo;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class LeitorCSV {

    public static List<Recebivel> lerCSV(String caminhoArquivo) {
        List<Recebivel> recebiveis = new ArrayList<>();

        try (BufferedReader br = Files.newBufferedReader(
                Path.of(caminhoArquivo), StandardCharsets.UTF_8)) {

            String linha;
            int numeroLinha = 0;

            while ((linha = br.readLine()) != null) {
                numeroLinha++;

                if (linha.trim().isEmpty()) {
                    continue;
                }

                // Remove BOM UTF-8, se existir no início do arquivo.
                if (numeroLinha == 1) {
                    linha = linha.replace("\uFEFF", "");
                }

                String[] dados = linha.split(";", -1);

                if (dados[0].trim().equalsIgnoreCase("nomeFundo")) {
                    continue;
                }

                if (dados.length != 11) {
                    System.err.println(
                            "ERRO na linha " + numeroLinha
                                    + ": esperadas 11 colunas, encontradas "
                                    + dados.length);
                    continue;
                }

                try {
                    Recebivel recebivel = new Recebivel(
                            dados[0].trim(),
                            dados[1].trim(),
                            dados[2].trim(),
                            dados[3].trim(),
                            dados[4].trim(),
                            dados[5].trim(),
                            dados[6].trim(),
                            dados[7].trim(),
                            converterValor(dados[8]),
                            dados[9].trim(),
                            dados[10].trim()
                    );

                    recebiveis.add(recebivel);

                } catch (NumberFormatException e) {
                    System.err.println(
                            "ERRO na linha " + numeroLinha
                                    + ": valor nominal inválido: "
                                    + dados[8]);
                }
            }

        } catch (IOException e) {
            throw new RuntimeException(
                    "Erro ao ler o arquivo CSV: " + caminhoArquivo, e);
        }

        System.out.println(
                "Recebíveis lidos do CSV: " + recebiveis.size());

        return recebiveis;
    }

    private static double converterValor(String valor) {
        valor = valor.trim()
                .replace("R$", "")
                .replace(" ", "");

        if (valor.isEmpty()) {
            throw new NumberFormatException("Valor nominal vazio");
        }

        if (valor.contains(",")) {
            valor = valor.replace(".", "")
                    .replace(",", ".");
        }

        return Double.parseDouble(valor);
    }
}
