package com.example.demo;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;

public class BancoRapido {
    // O arquivo hackathon.db será criado automaticamente na raiz do projeto
    private static final String URL = "jdbc:sqlite:hackathon.db";

    // Chama isso no início do programa para garantir que a tabela existe
    public static void inicializar() {
        String sql = "CREATE TABLE IF NOT EXISTS registro ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "nome TEXT, "
                + "valor TEXT)";

        try (Connection conn = DriverManager.getConnection(URL);
             Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
            System.out.println("Banco de dados pronto!");
        } catch (Exception e) {
            System.out.println("Erro ao criar banco: " + e.getMessage());
        }
    }

    // Chama isso sempre que precisar salvar uma informação nova
    public static void salvarDado(String nome, String valor) {
        String sql = "INSERT INTO registro (nome, valor) VALUES (?, ?)";

        try (Connection conn = DriverManager.getConnection(URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, nome);
            pstmt.setString(2, valor);
            pstmt.executeUpdate();
            System.out.println("Dado salvo no banco: " + nome);
        } catch (Exception e) {
            System.out.println("Erro ao salvar: " + e.getMessage());
        }
    }
}