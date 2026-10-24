
package com.example.demo;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class RecebivelDAO {

    private static final String URL = "jdbc:sqlite:hackathon.db";

    public RecebivelDAO() {
        inicializar();
    }

    public void inicializar() {
        String sql = """
            CREATE TABLE IF NOT EXISTS recebiveis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_fundo TEXT,
                doc_fundo TEXT,
                nome_cedente TEXT,
                doc_cedente TEXT,
                nome_sacado TEXT,
                doc_sacado TEXT,
                nu_documento TEXT,
                tipo_recebivel TEXT,
                valor_nominal REAL,
                data_vencimento TEXT,
                data_aquisicao TEXT
            )
            """;

        try (Connection conn = DriverManager.getConnection(URL);
             Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
            System.out.println("Tabela de recebíveis pronta!");
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao inicializar recebíveis", e);
        }
    }

    public int contar() {
        String sql = "SELECT COUNT(*) FROM recebiveis";

        try (Connection conn = DriverManager.getConnection(URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            return rs.getInt(1);
        } catch (SQLException e) {
            throw new RuntimeException("Erro ao contar recebíveis", e);
        }
    }

    public void salvar(Recebivel r) {
        String sql = """
            INSERT INTO recebiveis (
                nome_fundo, doc_fundo, nome_cedente, doc_cedente,
                nome_sacado, doc_sacado, nu_documento, tipo_recebivel,
                valor_nominal, data_vencimento, data_aquisicao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;

        try (Connection conn = DriverManager.getConnection(URL);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, r.getNomeFundo());
            ps.setString(2, r.getDocFundo());
            ps.setString(3, r.getNomeCedente());
            ps.setString(4, r.getDocCedente());
            ps.setString(5, r.getNomeSacado());
            ps.setString(6, r.getDocSacado());
            ps.setString(7, r.getNuDocumento());
            ps.setString(8, r.getTipoRecebivel());
            ps.setDouble(9, r.getValorNominal());
            ps.setString(10, r.getDataVencimentoOriginal());
            ps.setString(11, r.getDataAquisicao());

            ps.executeUpdate();

        } catch (SQLException e) {
            throw new RuntimeException("Erro ao salvar recebível", e);
        }
    }

    public List<Recebivel> listar() {
        List<Recebivel> lista = new ArrayList<>();

        String sql = "SELECT * FROM recebiveis ORDER BY id";

        try (Connection conn = DriverManager.getConnection(URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                Recebivel r = new Recebivel(
                        rs.getString("nome_fundo"),
                        rs.getString("doc_fundo"),
                        rs.getString("nome_cedente"),
                        rs.getString("doc_cedente"),
                        rs.getString("nome_sacado"),
                        rs.getString("doc_sacado"),
                        rs.getString("nu_documento"),
                        rs.getString("tipo_recebivel"),
                        rs.getDouble("valor_nominal"),
                        rs.getString("data_vencimento"),
                        rs.getString("data_aquisicao")
                );

                lista.add(r);
            }

            return lista;

        } catch (SQLException e) {
            throw new RuntimeException("Erro ao consultar recebíveis", e);
        }
    }


    public void apagarTodos() {
        String sql = "DELETE FROM recebiveis";

        try (Connection conn = DriverManager.getConnection(URL);
             Statement stmt = conn.createStatement()) {

            stmt.executeUpdate(sql);
            System.out.println("Registros de recebíveis apagados.");

        } catch (SQLException e) {
            throw new RuntimeException(
                    "Erro ao apagar recebíveis", e);
        }
    }

    public void salvarTodos(List<Recebivel> recebiveis) {
        String sql = """
        INSERT INTO recebiveis (
            nome_fundo, doc_fundo, nome_cedente, doc_cedente,
            nome_sacado, doc_sacado, nu_documento, tipo_recebivel,
            valor_nominal, data_vencimento, data_aquisicao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;

        try (Connection conn = DriverManager.getConnection(URL);
             PreparedStatement ps = conn.prepareStatement(sql)) {

            conn.setAutoCommit(false);

            int quantidade = 0;

            for (Recebivel r : recebiveis) {
                ps.setString(1, r.getNomeFundo());
                ps.setString(2, r.getDocFundo());
                ps.setString(3, r.getNomeCedente());
                ps.setString(4, r.getDocCedente());
                ps.setString(5, r.getNomeSacado());
                ps.setString(6, r.getDocSacado());
                ps.setString(7, r.getNuDocumento());
                ps.setString(8, r.getTipoRecebivel());
                ps.setDouble(9, r.getValorNominal());
                ps.setString(10, r.getDataVencimentoOriginal());
                ps.setString(11, r.getDataAquisicao());

                ps.addBatch();
                quantidade++;

                if (quantidade % 1000 == 0) {
                    ps.executeBatch();
                    ps.clearBatch();
                    System.out.println(
                            quantidade + " recebíveis preparados para gravação..."
                    );
                }
            }

            ps.executeBatch();
            conn.commit();

            System.out.println(
                    "Importação concluída: " + quantidade + " recebíveis."
            );

        } catch (SQLException e) {
            throw new RuntimeException(
                    "Erro ao importar recebíveis em lote", e
            );
        }
    }


}
