
package com.example.demo;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recebiveis")
public class RecebivelController {

    private final Regras regras;
    private final RecebivelDAO banco;

    public RecebivelController() {
        this.regras = new Regras(new Configuracao());
        this.banco = new RecebivelDAO();

        List<Recebivel> dados =
                LeitorCSV.lerCSV("recebiveis.csv");

        System.out.println(
                "Recebíveis encontrados no CSV: " + dados.size()
        );

        if (!dados.isEmpty()) {
            banco.salvarTodos(dados);

            System.out.println(
                    "Recebíveis importados: " + dados.size()
            );
        }
    }

    @GetMapping
    public List<Recebivel> listar() {
        return banco.listar();
    }

    @GetMapping("/validar")
    public List<Map<String, Object>> validar() {
        List<Recebivel> recebiveis = banco.listar();

        List<Map<String, Object>> resultado =
                new ArrayList<>();

        for (Recebivel recebivel : recebiveis) {
            List<String> erros = regras.validar(recebivel);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("linha", recebiveis.indexOf(recebivel) + 2);
            item.put("id", recebivel.getNuDocumento());
            item.put("status", erros.isEmpty() ? "APROVADO" : "BARRADO");
            item.put("barrado_por", erros);
            item.put("situacaoCadastral",
                    regras.consultarSituacaoCadastral(recebivel.getDocSacado()));

            if (erros.isEmpty()) {
                BigDecimal valorCompra =
                        regras.calcularValorCompra(recebivel);

                item.put("valorCompra", valorCompra);
            }

            resultado.add(item);
        }

        return resultado;
    }

    @GetMapping(
            value = "/validar/linhas",
            produces = "application/x-ndjson")
    public ResponseEntity<String> validarEmLinhas() {
        List<Recebivel> recebiveis = banco.listar();
        StringBuilder saida = new StringBuilder();

        for (Recebivel recebivel : recebiveis) {
            List<String> erros = regras.validar(recebivel);

            String errosJson = erros.stream()
                    .map(erro -> "\"" + escaparJson(erro) + "\"")
                    .collect(Collectors.joining(",", "[", "]"));

            String situacao = regras.consultarSituacaoCadastral(
                    recebivel.getDocSacado());

            String linha = "{\"documento\":\""
                    + escaparJson(recebivel.getNuDocumento())
                    + "\",\"valido\":" + erros.isEmpty()
                    + ",\"erros\":" + errosJson
                    + ",\"situacaoCadastral\":\""
                    + escaparJson(situacao) + "\"";

            if (erros.isEmpty()) {
                linha += ",\"valorCompra\":"
                        + regras.calcularValorCompra(recebivel)
                        .toPlainString();
            }

            linha += "}";

            saida.append(linha).append("\n");
        }

        return ResponseEntity.ok()
                .contentType(new MediaType(
                        "application",
                        "x-ndjson",
                        StandardCharsets.UTF_8))
                .body(saida.toString());
    }

    private String escaparJson(String texto) {
        if (texto == null) {
            return "";
        }

        return texto
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
