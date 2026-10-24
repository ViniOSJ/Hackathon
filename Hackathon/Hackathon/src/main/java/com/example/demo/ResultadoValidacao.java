package com.example.demo;

import java.util.ArrayList;
import java.util.List;

public class ResultadoValidacao {
    private String idDocumento;
    private String status; // "APROVADO" ou "BARRADO"
    private List<String> barradoPor;

    public ResultadoValidacao(String idDocumento) {
        this.idDocumento = idDocumento;
        this.barradoPor = new ArrayList<>();
        this.status = "APROVADO"; // Status padrão até que alguma regra falhe
    }

    public void adicionarMotivoBloqueio(String motivo) {
        this.barradoPor.add(motivo);
        this.status = "BARRADO";
    }

    // Getters
    public String getIdDocumento() { return idDocumento; }
    public String getStatus() { return status; }
    public List<String> getBarradoPor() { return barradoPor; }
}