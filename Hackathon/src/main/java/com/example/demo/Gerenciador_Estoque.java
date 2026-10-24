package com.example.demo;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class Gerenciador_Estoque {

    public static List<Item_Estoque> lerCSV(String caminhoficheiro) {
        List<ItemEstoque> estoque = new ArrayList<>();
        String linha = "";
        String separador = ",";

        try (BufferedReader br = new BufferedReader(new FileReader(caminhoFicheiro))) {
            br.readLine();

            while ((linha = br.readLine()) != null) {
                String[] dados = linha.split(separador);

                String id = dados[0];
                String nomeProduto = dados[1];
                int quantidade = Integer.parseInt(dados[2]);

                estoque.add(new ItemEstoque(id, nomeProduto, quantidade));
            }
        } catch (IOException | NumberFormatException e) {
            e.printStackTrace();
        }

        return estoque;
    }
}
