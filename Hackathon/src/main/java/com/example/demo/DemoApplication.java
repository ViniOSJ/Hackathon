
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {

        // Inicia a aplicação Spring Boot
        SpringApplication.run(DemoApplication.class, args);

        // Inicializa o banco SQLite
        BancoRapido.inicializar();
    }
}
